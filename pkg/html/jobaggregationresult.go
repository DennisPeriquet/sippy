package html

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	sippyprocessingv1 "github.com/openshift/sippy/pkg/apis/sippyprocessing/v1"
)

// PlatformResults
type jobAggregationResult struct {
	AggregationName                             string
	JobRunSuccesses                             int
	JobRunFailures                              int
	JobRunKnownJobRunFailures                   int
	JobRunPassPercentage                        float64
	JobRunPassPercentageWithKnownJobRunFailures float64

	// JobResults for all jobs that match this platform, ordered by lowest JobRunPassPercentage to highest
	JobResults []sippyprocessingv1.JobResult

	// TestResults holds entries for each test that is a part of this aggregation.  Each entry aggregates the results of all runs of a single test.  The array is sorted from lowest JobRunPassPercentage to highest JobRunPassPercentage
	AllTestResults []sippyprocessingv1.TestResult
}

func convertPlatformToAggregationResult(platformResult *sippyprocessingv1.PlatformResults) *jobAggregationResult {
	if platformResult == nil {
		return nil
	}
	return &jobAggregationResult{
		AggregationName:                             platformResult.PlatformName,
		JobRunSuccesses:                             platformResult.JobRunSuccesses,
		JobRunFailures:                              platformResult.JobRunFailures,
		JobRunKnownJobRunFailures:                   platformResult.JobRunKnownFailures,
		JobRunPassPercentage:                        platformResult.JobRunPassPercentage,
		JobRunPassPercentageWithKnownJobRunFailures: platformResult.JobRunPassPercentageWithKnownFailures,
		JobResults:                                  platformResult.JobResults,
		AllTestResults:                              platformResult.AllTestResults,
	}
}

type jobAggregationResultRenderBuilder struct {
	// sectionBlock needs to be unique for each part of the report.  It is used to uniquely name the collapse/expand
	// sections so they open properly
	sectionBlock string

	currAggregationResult jobAggregationResult
	prevAggregationResult *jobAggregationResult

	release              string
	maxTestResultsToShow int
	colors               colorizationCriteria
	collapsedAs          string
}

func newJobAggregationResultRenderer(sectionBlock string, currJobResult jobAggregationResult, release string) *jobAggregationResultRenderBuilder {
	return &jobAggregationResultRenderBuilder{
		sectionBlock:          sectionBlock,
		currAggregationResult: currJobResult,
		release:               release,
		maxTestResultsToShow:  10, // just a default, can be overridden
		colors: colorizationCriteria{
			minRedPercent:    0,  // failure.  In this range, there is a systemic failure so severe that a reliable signal isn't available.
			minYellowPercent: 60, // at risk.  In this range, there is a systemic problem that needs to be addressed.
			minGreenPercent:  80, // no action required. This *should* be closer to 85%
		},
	}
}

func (b *jobAggregationResultRenderBuilder) withPrevious(prevJobResult *jobAggregationResult) *jobAggregationResultRenderBuilder {
	b.prevAggregationResult = prevJobResult
	return b
}

func (b *jobAggregationResultRenderBuilder) withMaxTestResultsToShow(maxTestResultsToShow int) *jobAggregationResultRenderBuilder {
	b.maxTestResultsToShow = maxTestResultsToShow
	return b
}

func (b *jobAggregationResultRenderBuilder) withColors(colors colorizationCriteria) *jobAggregationResultRenderBuilder {
	b.colors = colors
	return b
}

func (b *jobAggregationResultRenderBuilder) startCollapsedAs(collapsedAs string) *jobAggregationResultRenderBuilder {
	b.collapsedAs = collapsedAs
	return b
}

func (b *jobAggregationResultRenderBuilder) toHTML() string {
	safeSectionBlock := strings.ReplaceAll(strings.ReplaceAll(b.sectionBlock, ".", ""), " ", "")
	testsCollapseName := safeSectionBlock + "---" + b.currAggregationResult.AggregationName + "---tests"
	testsCollapseName = strings.ReplaceAll(strings.ReplaceAll(testsCollapseName, ".", ""), " ", "")
	jobsCollapseName := safeSectionBlock + "---" + b.currAggregationResult.AggregationName + "---jobs"
	jobsCollapseName = strings.ReplaceAll(strings.ReplaceAll(jobsCollapseName, ".", ""), " ", "")

	s := ""

	// TODO either make this a template or make this a builder that takes args and then has branches.
	//  that will fix the funny link that goes nowhere.
	template := `
			<tr class="%s">
				<td>
					%s
					<p>
					<button class="btn btn-primary btn-sm py-0" style="font-size: 0.8em" type="button" data-toggle="collapse" data-target=".%[3]s" aria-expanded="false" aria-controls="%[3]s">Expand Failing Tests</button>
					<button class="btn btn-primary btn-sm py-0" style="font-size: 0.8em" type="button" data-toggle="collapse" data-target=".%[4]s" aria-expanded="false" aria-controls="%[4]s">Expand Failing Jobs</button>
				</td>
				<td>
					%0.2f%% (%0.2f%%)<span class="text-nowrap">(%d runs)</span>
				</td>
				<td>
					%s
				</td>
				<td>
					%0.2f%% (%0.2f%%)<span class="text-nowrap">(%d runs)</span>
				</td>
			</tr>
		`

	naTemplate := `
			<tr class="%s">
				<td>
					%s
					<p>
					<button class="btn btn-primary btn-sm py-0" style="font-size: 0.8em" type="button" data-toggle="collapse" data-target=".%[3]s" aria-expanded="false" aria-controls="%[3]s">Expand Failing Tests</button>
					<button class="btn btn-primary btn-sm py-0" style="font-size: 0.8em" type="button" data-toggle="collapse" data-target=".%[4]s" aria-expanded="false" aria-controls="%[4]s">Expand Failing Jobs</button>
				</td>
				<td>
					%0.2f%% (%0.2f%%)<span class="text-nowrap">(%d runs)</span>
				</td>
				<td/>
				<td>
					NA
				</td>
			</tr>
		`

	rowColor := ""
	switch {
	case b.currAggregationResult.JobRunPassPercentage > b.colors.minGreenPercent:
		rowColor = "table-success"
	case b.currAggregationResult.JobRunPassPercentage > b.colors.minYellowPercent:
		rowColor = "table-warning"
	case b.currAggregationResult.JobRunPassPercentage > b.colors.minRedPercent:
		rowColor = "table-danger"
	default:
		rowColor = "error"
	}
	class := rowColor
	if len(b.collapsedAs) > 0 {
		class += " collapse " + b.collapsedAs
	}

	if b.prevAggregationResult != nil {
		arrow := ""
		delta := 5.0
		if b.currAggregationResult.JobRunSuccesses+b.currAggregationResult.JobRunFailures > 80 {
			delta = 2
		}

		if b.currAggregationResult.JobRunPassPercentage > b.prevAggregationResult.JobRunPassPercentage+delta {
			arrow = fmt.Sprintf(up, b.currAggregationResult.JobRunPassPercentage-b.prevAggregationResult.JobRunPassPercentage)
		} else if b.currAggregationResult.JobRunPassPercentage < b.prevAggregationResult.JobRunPassPercentage-delta {
			arrow = fmt.Sprintf(down, b.prevAggregationResult.JobRunPassPercentage-b.currAggregationResult.JobRunPassPercentage)
		} else if b.currAggregationResult.JobRunPassPercentage > b.prevAggregationResult.JobRunPassPercentage {
			arrow = fmt.Sprintf(flatup, b.currAggregationResult.JobRunPassPercentage-b.prevAggregationResult.JobRunPassPercentage)
		} else {
			arrow = fmt.Sprintf(flatdown, b.prevAggregationResult.JobRunPassPercentage-b.currAggregationResult.JobRunPassPercentage)
		}

		s = s + fmt.Sprintf(template,
			class,
			b.currAggregationResult.AggregationName,
			testsCollapseName,
			jobsCollapseName,
			b.currAggregationResult.JobRunPassPercentage,
			b.currAggregationResult.JobRunPassPercentageWithKnownJobRunFailures,
			b.currAggregationResult.JobRunSuccesses+b.currAggregationResult.JobRunFailures,
			arrow,
			b.prevAggregationResult.JobRunPassPercentage,
			b.prevAggregationResult.JobRunPassPercentageWithKnownJobRunFailures,
			b.prevAggregationResult.JobRunSuccesses+b.prevAggregationResult.JobRunFailures,
		)
	} else {
		s = s + fmt.Sprintf(naTemplate,
			class,
			b.currAggregationResult.AggregationName,
			testsCollapseName,
			jobsCollapseName,
			b.currAggregationResult.JobRunPassPercentage,
			b.currAggregationResult.JobRunPassPercentageWithKnownJobRunFailures,
			b.currAggregationResult.JobRunSuccesses+b.currAggregationResult.JobRunFailures,
		)
	}

	count := b.maxTestResultsToShow
	rowCount := 0
	rows := ""
	additionalMatches := 0
	for _, test := range b.currAggregationResult.AllTestResults {
		if count == 0 {
			additionalMatches++
			continue
		}
		count--

		encodedTestName := url.QueryEscape(regexp.QuoteMeta(test.Name))
		bugHTML := bugHTMLForTest(test.BugList, b.release, "", test.Name)

		rows = rows + fmt.Sprintf(testGroupTemplate, testsCollapseName,
			test.Name,
			b.currAggregationResult.AggregationName,
			encodedTestName,
			bugHTML,
			test.PassPercentage,
			test.Successes+test.Failures,
		)
		rowCount++
	}

	if additionalMatches > 0 {
		rows += fmt.Sprintf(`<tr class="collapse %s"><td colspan=2>Plus %d more tests</td></tr>`, testsCollapseName, additionalMatches)
	}
	if rowCount > 0 {
		s = s + fmt.Sprintf(`<tr class="collapse %s"><td colspan=2 class="font-weight-bold">Test Name</td><td class="font-weight-bold">Test Pass Rate</td></tr>`, testsCollapseName)
		s = s + rows
	} else {
		s = s + fmt.Sprintf(`<tr class="collapse %s"><td colspan=3 class="font-weight-bold">No Tests Matched Filters</td></tr>`, testsCollapseName)
	}

	return s
}
