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
import { Link, Redirect, Route, Switch, useRouteMatch } from 'react-router-dom'
import ReadinessReportOpts from '../releases/ReadinessReportOpts'
import SimpleBreadcrumbs from '../components/SimpleBreadcrumbs'

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
                    label="Component Readiness1"
                    key="1"
                    value="toplevel"
                    component={Link}
                    to={url + '/toplevel'}
                  />
                  <Tab
                    label="Component Readiness2"
                    key="2"
                    value="toplevel2"
                    component={Link}
                    to={url + '/toplevel2'}
                  />
                </Tabs>
              </Paper>
            </Grid>
            <Switch>
              <Route path={path + '/toplevel'}>
                <ReadinessReportOpts
                  release={props.release}
                  colorScale={[90, 100]}
                  data={data}
                />
              </Route>
              <Route path={path + '/toplevel2'}>
                <ReadinessReportOpts
                  release={'4.13'}
                  colorScale={[90, 100]}
                  data={data}
                />
              </Route>
              <Redirect from="/" to={url + '/toplevel'} />
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
