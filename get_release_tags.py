#!/usr/bin/env python3

"""
This program fetches release tags from Sippy for a given release.
It filters by stream=nightly and architecture=amd64.

Here are some examples of how to run it:
    ./get_release_tags.py 4.21
    ./get_release_tags.py 4.19
    ./get_release_tags.py 4.21 --stream ci --arch arm64
    ./get_release_tags.py 4.21 --days 7
    ./get_release_tags.py 4.21 --days 14
"""

import argparse
import json
import sys
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import requests


# ANSI color codes
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    RESET = '\033[0m'


def get_release_tags(
    release: str,
    stream: str = "nightly",
    arch: str = "amd64",
    days_back: Optional[int] = None,
    base_url: str = "https://sippy.dptools.openshift.org"
) -> List[str]:
    """
    Fetches release tags from Sippy API for the specified release, stream, and architecture.

    Arg(s):
        release (str): The release version (e.g., "4.21", "4.19").
        stream (str): The stream name (default: "nightly").
        arch (str): The architecture (default: "amd64").
        days_back (Optional[int]): Number of days back from today to filter (default: None, which means all).
        base_url (str): The base URL for the Sippy API.

    Return Value(s):
        List[dict]: List of release tag data.
    """
    filter_obj = {
        "items": [
            {
                "columnField": "architecture",
                "operatorValue": "equals",
                "value": arch
            },
            {
                "columnField": "stream",
                "operatorValue": "equals",
                "value": stream
            }
        ]
    }

    # URL encode the filter
    filter_param = urllib.parse.quote(json.dumps(filter_obj))

    # Build the API URL
    url = f"{base_url}/api/releases/tags?release={release}&filter={filter_param}&sortField=release_time&sort=desc"

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        # Filter by date client-side if days_back is specified
        if days_back is not None:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_back)
            filtered_data = []
            for item in data:
                release_time = datetime.fromisoformat(item["release_time"].replace("Z", "+00:00"))
                if release_time >= cutoff_date:
                    filtered_data.append(item)
            data = filtered_data

        return data

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from Sippy: {e}", file=sys.stderr)
        sys.exit(1)
    except (KeyError, json.JSONDecodeError) as e:
        print(f"Error parsing response: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """
    Main function to parse arguments and fetch release tags.
    """
    parser = argparse.ArgumentParser(
        description="Fetch release tags from Sippy for a given release."
    )
    parser.add_argument(
        "release",
        help="Release version (e.g., 4.21, 4.19)"
    )
    parser.add_argument(
        "--stream",
        default="nightly",
        help="Stream name (default: nightly)"
    )
    parser.add_argument(
        "--arch",
        default="amd64",
        help="Architecture (default: amd64)"
    )
    parser.add_argument(
        "--base-url",
        default="https://sippy.dptools.openshift.org",
        help="Base URL for Sippy API"
    )
    parser.add_argument(
        "--days",
        type=int,
        help="Number of days back from today to filter (e.g., 7, 14)"
    )

    args = parser.parse_args()

    release_data = get_release_tags(
        args.release,
        args.stream,
        args.arch,
        args.days,
        args.base_url
    )

    # Print each release tag with visual hours representation
    for i, item in enumerate(release_data):
        tag = item["release_tag"]
        phase = item.get("phase", "Unknown")

        # Color the tag based on phase
        if phase == "Accepted":
            colored_tag = f"{Colors.GREEN}{tag}{Colors.RESET}"
        elif phase == "Rejected":
            colored_tag = f"{Colors.RED}{tag}{Colors.RESET}"
        else:
            colored_tag = tag

        if i == 0:
            # First entry - show time since now
            now = datetime.now(timezone.utc)
            release_time = datetime.fromisoformat(item["release_time"].replace("Z", "+00:00"))
            time_diff = now - release_time
            hours_diff = time_diff.total_seconds() / 3600
        else:
            # Calculate hours between this release and the previous one (the one that came out right before)
            current_time = datetime.fromisoformat(item["release_time"].replace("Z", "+00:00"))
            previous_time = datetime.fromisoformat(release_data[i-1]["release_time"].replace("Z", "+00:00"))
            time_diff = previous_time - current_time  # Previous is newer, so previous - current gives positive
            hours_diff = time_diff.total_seconds() / 3600

        # Create visual representation with asterisks (1 hour = 1 asterisk)
        asterisks = "*" * int(hours_diff)
        hours_text = f"{hours_diff:.1f}h"

        print(f"{colored_tag} {hours_text:>8} {asterisks}")


if __name__ == "__main__":
    main()
