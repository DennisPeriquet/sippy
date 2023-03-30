import PropTypes from 'prop-types'

import { Alert, TabContext } from '@material-ui/lab'
import {
  Container,
  Grid,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@material-ui/core'
import React, { Fragment, useEffect } from 'react'

import './ComponentReadiness.css'
import { BOOKMARKS } from '../constants'
import { Link, Redirect, Route, Switch, useRouteMatch } from 'react-router-dom'
import JobTable from '../jobs/JobTable'
import SimpleBreadcrumbs from '../components/SimpleBreadcrumbs'
import TestByVariantTable from '../tests/TestByVariantTable'
import TestTable from '../tests/TestTable'

/**
 *  ComponentReadiness is the landing page for ComponentReadiness.
 */
export default function ComponentReadiness(props) {
  const { path, url } = useRouteMatch()

  const [fetchError, setFetchError] = React.useState('')
  const [isLoaded, setLoaded] = React.useState(false)
  const [data, setData] = React.useState({})

  const fetchData = () => {
    fetch(
      process.env.REACT_APP_API_URL + '/api/upgrade?release=' + props.release
    )
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('server returned ' + response.status)
        }
        return response.json()
      })
      .then((json) => {
        setData(json)
        setLoaded(true)
      })
      .catch((error) => {
        setFetchError(
          'Could not retrieve release ' + props.release + ', ' + error
        )
      })
  }

  useEffect(() => {
    document.title = `Sippy > ${props.release} > Component Readiness`
    fetchData()
  }, [])

  if (fetchError !== '') {
    return <Alert severity="error">Failed to load data, {fetchError}</Alert>
  }

  if (!isLoaded) {
    return <p>Loading...</p>
  }

  return (
    <Fragment>
      <SimpleBreadcrumbs
        release={props.release}
        currentPage="ComponentReadiness"
      />
      <Route
        path="/"
        render={({ location }) => (
          <TabContext value={path}>
            <Typography align="center" variant="h4">
              Component Readiness for {props.release}
            </Typography>
            <Grid container justifyContent="center" size="xl" className="view">
              <Paper>
                <Tabs
                  value={location.pathname.substring(
                    location.pathname.lastIndexOf('/') + 1
                  )}
                  indicatorColor="primary"
                  textColor="primary"
                >
                  <Tab
                    label="Component Readiness"
                    value="operators"
                    component={Link}
                    to={url + '/operators'}
                  />
                </Tabs>
              </Paper>
            </Grid>
            <Switch>
              <Route path={path + '/operators'}>
                <TestByVariantTable
                  release={props.release}
                  colorScale={[90, 100]}
                  data={data}
                />
              </Route>
              <Redirect from="/" to={url + '/operators'} />
            </Switch>
          </TabContext>
        )}
      />
    </Fragment>
  )
}

ComponentReadiness.propTypes = {
  release: PropTypes.string.isRequired,
}
