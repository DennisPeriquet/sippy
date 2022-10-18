package util

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strconv"
)

const (
	// Release is the usually somewhat older release we're importing during e2e runs (as it has far less data)
	// to then test sippy. Needs to match what we import in the e2e sh scripts.
	Release = "4.7"

	// APIPort is the port e2e.sh launches the sippy API on. These values must be kept in sync.
	APIPort = 18080
)

func buildURL(apiPath string) string {
	env_sippy_api_port := os.Getenv("SIPPY_API_PORT")
	env_sippy_endpoint := os.Getenv("SIPPY_ENDPOINT")

	var port = APIPort
	if len(env_sippy_api_port) > 0 {
		val, err := strconv.Atoi(env_sippy_api_port)
		if err == nil {
			port = val
		}
	}
	if len(env_sippy_endpoint) == 0 {
		env_sippy_endpoint = "localhost"
	}
	return fmt.Sprintf("http://%s:%d%s", env_sippy_endpoint, port, apiPath)
}

func SippyRequest(path string, data interface{}) error {
	res, err := http.Get(buildURL(path))
	if err != nil {
		return err
	}

	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		return err
	}
	err = json.Unmarshal(body, data)
	if err != nil {
		return err
	}
	return nil
}
