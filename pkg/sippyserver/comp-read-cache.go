package sippyserver

import (
	"encoding/gob"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	apitype "github.com/openshift/sippy/pkg/apis/api"
	"github.com/sirupsen/logrus"
)

const (
	cacheName = "comp-read-cache.gob"

	// cacheMAX is used to determine how often we write the cache to disk
	// i.e., write to disk on every N caches
	cacheMAX = 1

	// maxCacheSize represents the maximum amount we'll cache
	maxCacheSize = 2000
)

var (

	// compReadyAPICache respresents a cache that maps API call signatures to cached data
	compReadyAPICache = make(map[CompReadyAPIsig]apitype.ComponentReport, 500)
	hashesMu          sync.Mutex

	// cacheNum counts the number of caching operations
	cacheNum = 0
)

func init() {
	if err := loadAPISigCache(cacheName); err != nil {
		logrus.Errorf("Error loading %s: %v\n", cacheName, err)
		return
	}
	logrus.Infof("Loaded cache (%d items): %s\n", len(compReadyAPICache), cacheName)
}

// CompReadyAPISig represents an api call signature
// Store the creation time so we can implement aging out old entries
type CompReadyAPIsig struct {
	CreatedAt       time.Time
	BaseRelease     string
	SampleRelease   string
	BaseStartTime   time.Time
	BaseEndTime     time.Time
	SampleStartTime time.Time
	SampleEndTime   time.Time
	TestIDOption    apitype.ComponentReportRequestTestIdentificationOptions
	VariantOption   apitype.ComponentReportRequestVariantOptions
	ExcludeOption   apitype.ComponentReportRequestExcludeOptions
	AdvancedOption  apitype.ComponentReportRequestAdvancedOptions
}

// cacheResponsewithJSON is much like RespondWithJSON except we use our cache
func cacheRespondWithJSON(w http.ResponseWriter, fig CompReadyAPIsig) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)

	hashesMu.Lock()
	defer hashesMu.Unlock()
	if err := json.NewEncoder(w).Encode(compReadyAPICache[fig]); err != nil {
		fmt.Fprintf(w, `{"message": "could not marshal results: %s"}`, err)
	}
}

// cacheAPICallSig caches any output that was generated if the api call signature matches
func cacheAPICallSig(fig CompReadyAPIsig, outputs apitype.ComponentReport) {
	hashesMu.Lock()
	defer hashesMu.Unlock()
	if len(compReadyAPICache) > maxCacheSize {
		logrus.Warn("API cache size exceeded; not caching")
		return
	}
	compReadyAPICache[fig] = outputs
	cacheNum++
	if cacheNum > cacheMAX {
		cacheNum = 0
		if err := writeAPISigCache(cacheName); err != nil {
			logrus.Errorf("Seems the cache %s failed", cacheName)
			return
		}
		logrus.Infof("Wrote the cache %s\n", cacheName)
	} else {
		logrus.Infof("CacheNum = %d\n", cacheNum)
	}
}

// writeAPISigCache writes the cache to disk
// The caller is expected to lock and unlock
func writeAPISigCache(fileName string) error {

	file, err := os.Create(fileName)
	if err != nil {
		return fmt.Errorf("failed to create file: %v", err)
	}
	defer file.Close()

	encoder := gob.NewEncoder(file)
	if err := encoder.Encode(compReadyAPICache); err != nil {
		return fmt.Errorf("failed to encode and write hashes: %v", err)
	}

	return nil
}

// loadAPISigCache loads the cache from disk upon startup
func loadAPISigCache(fileName string) error {
	hashesMu.Lock()
	defer hashesMu.Unlock()

	file, err := os.Open(fileName)
	if err != nil {
		return fmt.Errorf("failed to open file: %v", err)
	}
	defer file.Close()

	decoder := gob.NewDecoder(file)
	if err := decoder.Decode(&compReadyAPICache); err != nil {
		return fmt.Errorf("failed to decode and read hashes: %v", err)
	}

	return nil
}
