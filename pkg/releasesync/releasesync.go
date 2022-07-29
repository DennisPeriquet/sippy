package releasesync

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/openshift/sippy/pkg/apis/api"
	"github.com/openshift/sippy/pkg/db"
	"github.com/openshift/sippy/pkg/db/models"
	log "github.com/sirupsen/logrus"
)

const (
	releaseTagsTable = "release_tags"
	releaseJobRuns   = "release_job_runs"
	succeeded        = "Succeeded"
	failed           = "Failed"
)

type releaseSyncOptions struct {
	db            *db.DB
	httpClient    *http.Client
	releases      []string
	architectures []string
}

func Import(dbc *db.DB, releases, architectures []string) error {
	o := releaseSyncOptions{
		db:            dbc,
		releases:      releases,
		architectures: architectures,
		httpClient:    &http.Client{Timeout: 60 * time.Second},
	}

	return o.Run()
}

func (r *releaseSyncOptions) Run() error {
	for _, release := range r.releases {

		log.Infof("Fetching release %s from release controller...\n", release)
		allTags := r.fetchReleaseTags(release)

		for _, tags := range allTags {
			for _, tag := range tags.Tags {
				mReleaseTag := models.ReleaseTag{}
				r.db.DB.Table(releaseTagsTable).Where(`"release_tag" = ?`, tag.Name).Find(&mReleaseTag)
				// expect Phase to be populated if the record is present
				if len(mReleaseTag.Phase) > 0 {

					if mReleaseTag.Phase != tag.Phase {
						log.Infof("Fetching updated tag %s from release controller...\n", tag.Name)
						releaseTag := r.buildReleaseTag(tags.Architecture, release, tag)

						if releaseTag == nil {
							continue
						}

						// sync up the ids and created at
						releaseTag.ID = mReleaseTag.ID
						releaseTag.CreatedAt = mReleaseTag.CreatedAt

						if err := r.db.DB.Table(releaseTagsTable).Save(releaseTag).Error; err != nil {
							return err
						}
					}
					continue
				}

				log.Infof("Fetching tag %s from release controller...\n", tag.Name)
				releaseTag := r.buildReleaseTag(tags.Architecture, release, tag)

				if releaseTag == nil {
					continue
				}

				if err := r.db.DB.Create(&releaseTag).Error; err != nil {
					return err
				}
			}
		}
	}

	return nil
}

func (r *releaseSyncOptions) buildReleaseTag(architecture, release string, tag ReleaseTag) *models.ReleaseTag {
	releaseDetails := r.fetchReleaseDetails(architecture, release, tag)
	releaseTag := r.releaseDetailsToDB(architecture, tag, releaseDetails)

	// We skip releases that aren't fully baked (i.e. all jobs run and changelog calculated)
	if releaseTag == nil || (releaseTag.Phase != api.PayloadAccepted && releaseTag.Phase != api.PayloadRejected) {
		return nil
	}

	// PR is many-to-many, find the existing relation. TODO: There must be a more clever way to do this...
	for i, pr := range releaseTag.PullRequests {
		existingPR := models.ReleasePullRequest{}
		result := r.db.DB.Table("release_pull_requests").Where("url = ?", pr.URL).Where("name = ?", pr.Name).First(&existingPR)
		if result.Error == nil {
			releaseTag.PullRequests[i] = existingPR
		}
	}

	return releaseTag
}

func (r *releaseSyncOptions) fetchReleaseDetails(architecture, release string, tag ReleaseTag) ReleaseDetails {
	releaseDetails := ReleaseDetails{}
	releaseName := release
	if architecture != "amd64" {
		releaseName += "-" + architecture
	}

	rcURL := fmt.Sprintf("https://%s.ocp.releases.ci.openshift.org/api/v1/releasestream/%s/release/%s", architecture, releaseName, tag.Name)

	resp, err := r.httpClient.Get(rcURL)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(&releaseDetails); err != nil {
		panic(err)
	}

	return releaseDetails
}

func (r *releaseSyncOptions) fetchReleaseTags(release string) []ReleaseTags {
	allTags := make([]ReleaseTags, 0)
	for _, arch := range r.architectures {
		tags := ReleaseTags{
			Architecture: arch,
		}
		releaseName := release
		if arch != "amd64" {
			releaseName += "-" + arch
		}
		uri := fmt.Sprintf("https://%s.ocp.releases.ci.openshift.org/api/v1/releasestream/%s/tags", arch, releaseName)
		resp, err := r.httpClient.Get(uri)
		if err != nil {
			panic(err)
		}
		if resp.StatusCode != http.StatusOK {
			log.Errorf("release controller returned non-200 error code for %s: %d %s", uri, resp.StatusCode, resp.Status)
			continue
		}

		if err := json.NewDecoder(resp.Body).Decode(&tags); err != nil {
			log.Errorf("couldn't decode json: %v", err)
			resp.Body.Close()
			continue
		}
		resp.Body.Close()
		allTags = append(allTags, tags)
	}
	return allTags
}

// checkReleaseJobRun checks the database for an existing ReleaseJobRun with the given
// id.  If it exists, it will return a new ReleaseJobRun with info from the already
// existing ReleaseJobRun and remove the existing one from the database.
func (r *releaseSyncOptions) checkReleaseJobRun(id uint, platform, kind string) models.ReleaseJobRun {

	existingReleaseJobRuns := make([]models.ReleaseJobRun, 0)
	if p := r.db.DB.Table(releaseJobRuns).Where(`"prow_job_run_id" = ?`, id).Scan(&existingReleaseJobRuns); p.Error == nil {
		count := len(existingReleaseJobRuns)
		if count > 1 {
			fmt.Printf("Warning: found %d entries for %d", count, id)
		}
		ret := models.ReleaseJobRun{
			Name:           id,
			JobName:        platform,
			Kind:           kind,
			State:          existingReleaseJobRuns[count-1].State,
			URL:            existingReleaseJobRuns[count-1].URL,
			Retries:        existingReleaseJobRuns[count-1].Retries,
			TransitionTime: existingReleaseJobRuns[count-1].TransitionTime,
		}

		// Delete all entries that have this prow_job_run_id.
		//r.db.DB.Raw(fmt.Sprintf("DELETE FROM %s where prow_job_run_id = %d", releaseJobRuns, id))
		fmt.Println(fmt.Sprintf("DELETE FROM %s where prow_job_run_id = %d", releaseJobRuns, id))
		return ret
	}
	return nil
}

func (r *releaseSyncOptions) releaseDetailsToDB(architecture string, tag ReleaseTag, details ReleaseDetails) *models.ReleaseTag {
	release := models.ReleaseTag{
		Architecture: architecture,
		ReleaseTag:   details.Name,
		Phase:        tag.Phase,
	}
	// 4.10.0-0.nightly-2021-11-04-001635 -> 4.10
	parts := strings.Split(details.Name, ".")
	if len(parts) >= 2 {
		release.Release = strings.Join(parts[:2], ".")
	}

	// Get "nightly" or "ci" from the string
	if len(parts) >= 4 {
		stream := strings.Split(parts[3], "-")
		if len(stream) >= 2 {
			release.Stream = stream[0]
		}
	}

	dateTime := regexp.MustCompile(`.*([0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{6})`)
	match := dateTime.FindStringSubmatch(tag.Name)
	if len(match) > 1 {
		t, err := time.Parse("2006-01-02-150405", match[1])
		if err == nil {
			release.ReleaseTime = t
		}
	}

	if len(details.ChangeLog) == 0 {
		return nil // changelog not available yet
	}

	changelog := NewChangelog(tag.Name, string(details.ChangeLog))
	release.KubernetesVersion = changelog.KubernetesVersion()
	release.CurrentOSURL, release.CurrentOSVersion, release.PreviousOSURL, release.PreviousOSVersion, release.OSDiffURL = changelog.CoreOSVersion()
	release.PreviousReleaseTag = changelog.PreviousReleaseTag()
	release.Repositories = changelog.Repositories()
	release.PullRequests = changelog.PullRequests()
	release.JobRuns = r.releaseJobRunsToDB(details)

	// set forced flag
	failedBlocking := false

	for _, jRun := range release.JobRuns {
		if jRun.State == failed {
			if jRun.Kind == "Blocking" {
				failedBlocking = true
				break
			}
		}
	}

	if release.Phase == "Accepted" {
		release.Forced = failedBlocking
	} else if release.Phase == "Rejected" {
		release.Forced = !failedBlocking
	}

	return &release
}

func (r *releaseSyncOptions) releaseJobRunsToDB(details ReleaseDetails) []models.ReleaseJobRun {
	rows := make([]models.ReleaseJobRun, 0)
	results := make(map[uint]models.ReleaseJobRun)

	if jobs, ok := details.Results["blockingJobs"]; ok {
		for platform, jobResult := range jobs {
			id := idFromURL(jobResult.URL)

			kind := "Blocking"
			if newReleaseJobRun := r.checkReleaseJobRun(id, platform, kind); newReleaseJobRun != nil {
				results[id] = newReleaseJobRun
			} else {
				results[id] = models.ReleaseJobRun{
					Name:           id,
					JobName:        platform,
					Kind:           kind,
					State:          jobResult.State,
					URL:            jobResult.URL,
					Retries:        jobResult.Retries,
					TransitionTime: jobResult.TransitionTime,
				}
			}
		}
	}

	if jobs, ok := details.Results["informingJobs"]; ok {
		for platform, jobResult := range jobs {
			id := idFromURL(jobResult.URL)

			kind := "Informing"
			if newReleaseJobRun := r.checkReleaseJobRun(id, platform, kind); newReleaseJobRun != nil {
				results[id] = newReleaseJobRun
			} else {
				results[id] = models.ReleaseJobRun{
					Name:           id,
					JobName:        platform,
					Kind:           kind,
					State:          jobResult.State,
					URL:            jobResult.URL,
					Retries:        jobResult.Retries,
					TransitionTime: jobResult.TransitionTime,
			}
		}
	}

	// For all upgrades, update the row for the corresponding prow job.
	for _, upgrade := range append(details.UpgradesTo, details.UpgradesFrom...) {
		for _, run := range upgrade.History {
			id := idFromURL(run.URL)
			if result, ok := results[id]; ok {
				result.Upgrade = true
				result.UpgradesFrom = upgrade.From
				result.UpgradesTo = upgrade.To
				results[id] = result
			}
		}
	}

	for _, result := range results {
		rows = append(rows, result)
	}

	return rows
}

func idFromURL(prowURL string) uint {
	parsed, err := url.Parse(prowURL)
	if err != nil {
		return 0
	}

	base := path.Base(parsed.Path)
	prowID, err := strconv.ParseUint(base, 10, 64)
	if err != nil {
		return 0
	}
	return uint(prowID)
}
