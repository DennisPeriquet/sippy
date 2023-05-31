import { Alert } from '@material-ui/lab'
import { format } from 'date-fns'
import { safeEncodeURIComponent } from '../helpers'
import { Typography } from '@material-ui/core'
import React from 'react'

// Set to true for debug mode
export const debugMode = false

// Make the HH:mm:ss as zeros to be more conducive to caching query caching.
export const dateFormat = 'yyyy-MM-dd 00:00:00'
export const dateEndFormat = 'yyyy-MM-dd 23:59:59'

// This is the table we use when the first page is initially rendered.
export const initialPageTable = {
  rows: [
    {
      component: 'None',
      columns: [
        {
          empty: 'None',
          status: 3, // Let's start with success
        },
      ],
    },
  ],
}
export const noDataTable = {
  rows: [
    {
      component: 'No Data found',
      columns: [
        {
          empty: 'None',
          status: 3, // Let's start with success
        },
      ],
    },
  ],
}
export const cancelledDataTable = {
  rows: [
    {
      component: 'Cancelled',
      columns: [
        {
          empty: 'None',
          status: 3, // Let's start with success
        },
      ],
    },
  ],
}
// Make one place to create the Component Readiness api call
export function getAPIUrl() {
  return process.env.REACT_APP_API_URL + '/api/component_readiness'
}

// Make one place to create the Component Readiness test_details api call
export function getTestDetailsAPIUrl() {
  return process.env.REACT_APP_API_URL + '/api/component_readiness/test_details'
}

export const gotoCompReadyMain = () => {
  window.location.href = '/sippy-ng/component_readiness/main'
  //window.history.back()
}

// When we get a fetch error, this will print a standard message.
export function gotFetchError(fetchError) {
  return (
    <Alert severity="error">
      <h2>Failed to load component readiness data</h2>
      <h3>
        {fetchError.split('\n').map((item) => (
          <>
            <hr />
            {item}
          </>
        ))}
      </h3>
      <hr />
      <h3>Check, and possibly fix api server, then click below to retry</h3>
      <button onClick={gotoCompReadyMain}>Retry</button>
    </Alert>
  )
}

// Given the data pulled from the API server, calculate an array
// of columns using the first row.  Assumption: the number of columns
// is the same across all rows.
// A column looks like this and we concatenate all fields except status:
//   "columns": [
//       {
//         "network": "ovn",
//         "arch": "amd64",
//         "platform": "alibaba",
//         "status": 0
//       },
// Do our best to handle empty data or a "cancelled" condition.
export function getColumns(data) {
  if (!data || !data.rows || !data.rows[0] || !data.rows[0].component) {
    console.log(
      'data is one of: undefined, no rows, no rows[0], no row[0].component'
    )
    return ['No column']
  }
  if (data.rows[0].component == 'None' || !data.rows[0].columns) {
    return ['No data']
  }
  if (data.rows[0].component === 'Cancelled') {
    console.log('got cancelled')
    return ['Cancelled']
  }

  const firstColumn = data.rows[0].columns
  let columnNames = []
  firstColumn.forEach((column) => {
    const columnValues = Object.keys(column)
      .filter((key) => key != 'status')
      .map((key) => column[key])
    columnNames.push(columnValues.join(' '))
  })

  return columnNames
}

// The API likes RFC3339 times and the date pickers don't.  So we use this
// function to convert for when we call the API.
// 4 digits, followed by a -, followed by 2 digits, and so on all wrapped in
// a group so we can refer to them as $1 and $2 respectively.
// We add a 'T' in the middle and a 'Z' on the end.
export function makeRFC3339Time(aUrlStr) {
  // Translate all the %20 and %3a into spaces and colons so that the regex can work.
  const decodedStr = decodeURIComponent(aUrlStr)
  // URLSearchParams uses a + to separate date and time.
  const regex = /(\d{4}-\d{2}-\d{2})[\s+](\d{2}:\d{2}:\d{2})/g
  const replaceStr = '$1T$2Z'
  let retVal = decodedStr.replace(regex, replaceStr)

  // The api thinks that the null component is real and will filter accordingly
  // so omit it.
  retVal = retVal.replace(/&component=null/g, '')
  return retVal
}

// Return a formatted date given a long form date from the date picker.
export function formatLongDate(aLongDateStr) {
  const dateObj = new Date(aLongDateStr)
  const ret = format(dateObj, dateFormat)
  return ret
}

export function formatLongEndDate(aLongDateStr) {
  const dateObj = new Date(aLongDateStr)
  const ret = format(dateObj, dateEndFormat)
  return ret
}

// These next set of variables are used for CompReadyMainInputs

export const groupByList = ['cloud', 'arch', 'network', 'upgrade', 'variants']

// TODO: Get these from single place.
export const excludeCloudsList = [
  'alibaba',
  'aws',
  'azure',
  'gcp',
  'ibmcloud',
  'libvirt',
  'metal-assisted',
  'metal-ipi',
  'openstack',
  'ovirt',
  'unknown',
  'vsphere',
  'vsphere-upi',
]

// TODO: Get these from single place.
export const excludeArchesList = [
  'amd64',
  'arm64',
  'ppc64le',
  's390x',
  'heterogeneous',
]

export const excludeNetworksList = ['ovn', 'sdn']

export const excludeUpgradesList = [
  'no-upgrade',
  'none',
  'upgrade-micro',
  'upgrade-minor',
]

export const excludeVariantsList = [
  'assisted',
  'compact',
  'fips',
  'hypershift',
  'microshift',
  'osd',
  'proxy',
  'rt',
  'serial',
  'single-node',
  'standard',
  'techpreview',
]

// Take a string that is an "environment" (environment is a list of strings that describe
// items in one or more of the lists above) and split it up so that it can be used in
// an api call.  We keep this concept of "environment" because it's used for column labels.
export function expandEnvironment(environmentStr) {
  if (
    environmentStr == null ||
    environmentStr == '' ||
    environmentStr === 'No data'
  ) {
    return ''
  }
  const items = environmentStr.split(' ')
  const params = {}
  items.forEach((item) => {
    if (excludeCloudsList.includes(item)) {
      params.platform = item
    } else if (excludeArchesList.includes(item)) {
      params.arch = item
    } else if (excludeNetworksList.includes(item)) {
      params.network = item
    } else if (excludeUpgradesList.includes(item)) {
      params.upgrade = item
    } else if (excludeVariantsList.includes(item)) {
      params.variant = item
    } else {
      console.log(`Warning: Item '${item}' not found in lists`)
    }
  })
  const paramStrings = Object.entries(params).map(
    ([key, value]) => `${key}=${value}`
  )

  // We keep the environment along with the expanded environment for other components that
  // may use it.
  const safeEnvironment = safeEncodeURIComponent(environmentStr)
  const retVal =
    `&environment=${safeEnvironment}` + '&' + paramStrings.join('&')
  return retVal
}

// Take the values needed to make an api call and return a string that can be used to
// make that call.
export function getUpdatedUrlParts(
  baseRelease,
  baseStartTime,
  baseEndTime,
  sampleRelease,
  sampleStartTime,
  sampleEndTime,
  groupByCheckedItems,
  excludeCloudsCheckedItems,
  excludeArchesCheckedItems,
  excludeNetworksCheckedItems,
  excludeUpgradesCheckedItems,
  excludeVariantsCheckedItems,
  confidence,
  pity,
  minFail,
  ignoreDisruption,
  ignoreMissing
) {
  const valuesMap = {
    baseRelease: baseRelease,
    baseStartTime: formatLongDate(baseStartTime),
    baseEndTime: formatLongEndDate(baseEndTime),
    sampleRelease: sampleRelease,
    sampleStartTime: formatLongDate(sampleStartTime),
    sampleEndTime: formatLongEndDate(sampleEndTime),
    confidence: confidence,
    pity: pity,
    minFail: minFail,
    ignoreDisruption: ignoreDisruption,
    ignoreMissing: ignoreMissing,
    //component: component,
  }

  const arraysMap = {
    exclude_clouds: excludeCloudsCheckedItems,
    exclude_arches: excludeArchesCheckedItems,
    exclude_networks: excludeNetworksCheckedItems,
    exclude_upgrades: excludeUpgradesCheckedItems,
    exclude_variants: excludeVariantsCheckedItems,
    group_by: groupByCheckedItems,
  }

  const queryParams = new URLSearchParams()

  // Render the plain values first.
  Object.entries(valuesMap).forEach(([key, value]) => {
    queryParams.append(key, value)
  })

  // Render the array values.
  Object.entries(arraysMap).forEach(([key, value]) => {
    if (value && value.length) {
      queryParams.append(key, value.join(','))
    }
  })

  // Stringify and put the begin param character.
  const queryString = queryParams.toString()
  const retVal = `?${queryString}`
  return retVal
}

// Single place to make titles so they look consistent as well as capture the
// key attributes you may want for debugging.
export function makePageTitle(title, ...args) {
  return (
    <Typography variant="h4" style={{ margin: 20, textAlign: 'center' }}>
      <div>{title}</div>
      {debugMode &&
        args.map((item, index) => (
          <div key={index}>
            <Typography variant="body2" component="div" key={index}>
              {item}
            </Typography>
          </div>
        ))}
      <hr />
    </Typography>
  )
}
