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
	cacheName     = "comp-read-cache-34516e31.gob"
	cacheTestName = "comp-read-cache-test-34516e31.gob"

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

	// compReadyTestAPICache respresents a cache that maps API call signatures to cached Test data
	compReadyAPITestCache = make(map[CompReadyAPIsig]apitype.ComponentReportTestDetails, 500)
	hashesTestMu          sync.Mutex

	// cacheNum counts the number of caching operations
	cacheNum = 0
	// cacheTestNum counts the number of caching operations
	cacheTestNum = 0
)

func init() {
	if err := loadAPISigCache(cacheName); err != nil {
		logrus.Warningf("Error loading %s: %v\n", cacheName, err)
		logrus.Infof("It will be created.")
		return
	}
	logrus.Infof("Loaded cache (%d items): %s\n", len(compReadyAPICache), cacheName)
	if err := loadAPISigTestCache(cacheTestName); err != nil {
		logrus.Warningf("Error loading %s: %v\n", cacheTestName, err)
		logrus.Infof("It will be created.")
		return
	}
	logrus.Infof("Loaded test cache (%d items): %s\n", len(compReadyAPITestCache), cacheTestName)
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

// cacheResponsewithJSON is much like RespondWithJSON except we use our cache
func cacheTestRespondWithJSON(w http.ResponseWriter, fig CompReadyAPIsig) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(http.StatusOK)

	hashesTestMu.Lock()
	defer hashesTestMu.Unlock()
	if err := json.NewEncoder(w).Encode(compReadyAPITestCache[fig]); err != nil {
		fmt.Fprintf(w, `{"message": "could not marshal test results: %s"}`, err)
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

// cacheAPICallTestSig caches any output, for test, that was generated if the api call signature matches
func cacheAPICallTestSig(fig CompReadyAPIsig, outputs apitype.ComponentReportTestDetails) {
	hashesTestMu.Lock()
	defer hashesTestMu.Unlock()
	if len(compReadyAPITestCache) > maxCacheSize {
		logrus.Warn("API test cache size exceeded; not caching")
		return
	}
	compReadyAPITestCache[fig] = outputs
	cacheTestNum++
	if cacheTestNum > cacheMAX {
		cacheTestNum = 0
		if err := writeAPISigTestCache(cacheTestName); err != nil {
			logrus.Errorf("Seems the test cache %s failed", cacheName)
			return
		}
		logrus.Infof("Wrote the test cache %s\n", cacheName)
	} else {
		logrus.Infof("CacheTestNum = %d\n", cacheTestNum)
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

// writeAPISigTestCache writes the test cache to disk
// The caller is expected to lock and unlock
func writeAPISigTestCache(fileName string) error {

	file, err := os.Create(fileName)
	if err != nil {
		return fmt.Errorf("failed to create file: %v", err)
	}
	defer file.Close()

	encoder := gob.NewEncoder(file)
	if err := encoder.Encode(compReadyAPITestCache); err != nil {
		return fmt.Errorf("failed to encode and write test hashes: %v", err)
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

// loadAPISigTestCache loads the test cache from disk upon startup
func loadAPISigTestCache(fileName string) error {
	hashesTestMu.Lock()
	defer hashesTestMu.Unlock()

	file, err := os.Open(fileName)
	if err != nil {
		return fmt.Errorf("failed to open file: %v", err)
	}
	defer file.Close()

	decoder := gob.NewDecoder(file)
	if err := decoder.Decode(&compReadyAPITestCache); err != nil {
		return fmt.Errorf("failed to decode and read test hashes: %v", err)
	}

	return nil
}
