#!/usr/bin/env python3

"""
This program fetches release tags from Sippy or release-controller for a given release.
It filters by stream=nightly and architecture=amd64.

Here are some examples of how to run it:
    ./get_release_tags.py 4.21
    ./get_release_tags.py 4.19
    ./get_release_tags.py 4.21 --stream ci --arch arm64
    ./get_release_tags.py 4.21 --days 7
    ./get_release_tags.py 4.21 --days 14
    ./get_release_tags.py 4.21 --source rc
    ./get_release_tags.py 4.21 --source sippy
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


def get_release_tags_from_sippy(
    release: str,
    stream: str = "nightly",
    arch: str = "amd64",
    days_back: Optional[int] = None,
    base_url: str = "https://sippy.dptools.openshift.org"
) -> List[dict]:
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


def get_release_tags_from_rc(
    release: str,
    stream: str = "nightly",
    arch: str = "amd64",
    days_back: Optional[int] = None
) -> List[dict]:
    """
    Fetches release tags from release-controller API for the specified release, stream, and architecture.

    Arg(s):
        release (str): The release version (e.g., "4.21", "4.19").
        stream (str): The stream name (default: "nightly").
        arch (str): The architecture (default: "amd64").
        days_back (Optional[int]): Number of days back from today to filter (default: None, which means all).

    Return Value(s):
        List[dict]: List of release tag data.
    """
    # Build the release-controller URL
    url = f"https://{arch}.ocp.releases.ci.openshift.org/api/v1/releasestream/{release}.0-0.{stream}/tags"

    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        # Convert release-controller format to sippy-like format
        converted_data = []
        for tag in data.get("tags", []):
            # Extract timestamp from tag name (e.g., "4.20.0-0.ci-2025-12-16-210244")
            tag_parts = tag["name"].split("-")
            if len(tag_parts) >= 6:
                try:
                    # Parse date from tag: YYYY-MM-DD-HHMMSS
                    # Format: ['4.20.0', '0.ci', '2025', '12', '16', '210244']
                    year = tag_parts[2]
                    month = tag_parts[3]
                    day = tag_parts[4]
                    time_str = tag_parts[5]

                    # Ensure we have enough digits for time
                    if len(time_str) >= 6:
                        # Format time as HH:MM:SS
                        formatted_time = f"{time_str[:2]}:{time_str[2:4]}:{time_str[4:6]}"
                        release_time = f"{year}-{month}-{day}T{formatted_time}Z"
                    else:
                        release_time = "1970-01-01T00:00:00Z"
                except (IndexError, ValueError):
                    # Fallback if parsing fails
                    release_time = "1970-01-01T00:00:00Z"
            else:
                release_time = "1970-01-01T00:00:00Z"

            converted_item = {
                "release_tag": tag["name"],
                "release": release,
                "stream": stream,
                "architecture": arch,
                "phase": tag.get("phase", "Unknown"),
                "release_time": release_time
            }
            converted_data.append(converted_item)

        # Filter by date if days_back is specified
        if days_back is not None:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_back)
            filtered_data = []
            for item in converted_data:
                try:
                    release_time = datetime.fromisoformat(item["release_time"].replace("Z", "+00:00"))
                    if release_time >= cutoff_date:
                        filtered_data.append(item)
                except ValueError:
                    # Keep items with unparseable dates
                    filtered_data.append(item)
            converted_data = filtered_data

        # Sort by release time, newest first (like sippy does)
        converted_data.sort(key=lambda x: x["release_time"], reverse=True)

        return converted_data

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from release-controller: {e}", file=sys.stderr)
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
    parser.add_argument(
        "--source",
        choices=["sippy", "rc"],
        default="sippy",
        help="Data source: sippy (default) or rc (release-controller)"
    )

    args = parser.parse_args()

    if args.source == "rc":
        release_data = get_release_tags_from_rc(
            args.release,
            args.stream,
            args.arch,
            args.days
        )
    else:
        release_data = get_release_tags_from_sippy(
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
        elif phase == "Ready":
            # Ready status shows in normal/default color (no coloring)
            colored_tag = tag
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

        # Create visual representation with equals signs (1 hour = 1 =, every 5th = is a ., every 10th = is a |)
        total_chars = int(hours_diff)
        visual_chars = ""
        for i in range(1, total_chars + 1):
            if i % 10 == 0:
                visual_chars += "|"
            elif i % 5 == 0:
                visual_chars += "."
            else:
                visual_chars += "="

        hours_text = f"{hours_diff:.1f}h"

        print(f"{colored_tag} {hours_text:>8} {visual_chars}")


if __name__ == "__main__":
    main()
