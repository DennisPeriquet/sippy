import './ComponentReadiness.css'
import { Fragment } from 'react'
import { Typography } from '@material-ui/core'
import PropTypes from 'prop-types'
import React from 'react'
import TableCell from '@material-ui/core/TableCell'
import TableRow from '@material-ui/core/TableRow'

const getJobRunColor = (jobRun) => {
  if (jobRun.test_stats.flake_count > 0) {
    return 'purple'
  } else if (jobRun.test_stats.failure_count > 0) {
    return 'red'
  } else {
    return 'green'
  }
}

const infoCell = (stats) => {
  return (
    <Typography className="cr-cell-name">
      pass rate=
      {(stats.success_rate * 100).toFixed(2)}%
      <br />
      successes={stats.success_count}
      <br />
      failures={stats.failure_count}
      <br />
      flakes={stats.flake_count}
    </Typography>
  )
}

// Represents a row on page 5a when you clicked a status cell on on page4 or page4a
export default function CompReadyTestDetailRow(props) {
  // element: a test detail element
  // idx: array index of test detail element
  // jobFactor: a multiplicative factor for 10 jobs
  // showOnlyFailures: says to focus on job failures
  const { element, idx, jobFactor, showOnlyFailures } = props

  const testJobDetailCell = (element, statsKind) => {
    let item
    if (statsKind === 'base') {
      item = element.base_job_run_stats
    } else if (statsKind === 'sample') {
      item = element.sample_job_run_stats
    } else {
      item = 'unknown statsKind in testDetailJobRow'
      console.log('ERROR in testDetailJobRow')
    }

    let filtered = item
    // If we only care to see failures, then remove anything else
    // Protect against empty/undefined data
    if (showOnlyFailures) {
      filtered = item
        ? item.filter((jstat) => jstat.test_stats.failure_count > 0)
        : []
    }

    return (
      <div style={{ display: 'flex' }}>
        {filtered &&
          filtered.length > 0 &&
          filtered.slice(0, 10 * jobFactor).map((jobRun, jobRunIndex) => {
            return (
              <a
                href={jobRun.job_url}
                key={jobRunIndex}
                style={{
                  color: getJobRunColor(jobRun),
                  marginRight: '1px',
                }}
              >
                <Typography className="cr-cell-name">
                  {jobRun.test_stats.failure_count > 0 ? 'F' : 'S'}
                </Typography>
              </a>
            )
          })}
      </div>
    )
  }

  return (
    <Fragment>
      <TableRow key={idx}>
        <TableCell className={'cr-col-result'} key={'column' + '-' + idx}>
          <Typography className="cr-cell-name">{element.job_name}</Typography>
        </TableCell>
        <TableCell>{infoCell(element.base_stats)}</TableCell>
        <TableCell>{testJobDetailCell(element, 'base')}</TableCell>
        <TableCell>{infoCell(element.sample_stats)}</TableCell>
        <TableCell>{testJobDetailCell(element, 'sample')}</TableCell>
        <TableCell>
          <Typography className="cr-cell-name">
            {element.significant ? 'True' : 'False'}
          </Typography>
        </TableCell>
      </TableRow>
    </Fragment>
  )
}

CompReadyTestDetailRow.propTypes = {
  element: PropTypes.object.isRequired,
  idx: PropTypes.number.isRequired,
  jobFactor: PropTypes.number.isRequired,
  showOnlyFailures: PropTypes.bool.isRequired,
}
