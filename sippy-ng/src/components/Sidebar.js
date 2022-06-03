import { BOOKMARKS } from '../constants'
import {
  BugReport,
  ExpandLess,
  ExpandMore,
  FileCopyOutlined,
  GitHub,
  Restore,
} from '@material-ui/icons'
import { CapabilitiesContext } from '../App'
import { Link } from 'react-router-dom'
import { ListSubheader, useTheme } from '@material-ui/core'
import {
  pathForJobsWithFilter,
  pathForTestsWithFilter,
  withoutUnstable,
  withSort,
} from '../helpers'
import ApartmentIcon from '@material-ui/icons/Apartment'
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward'
import AssessmentIcon from '@material-ui/icons/Assessment'
import BugzillaSearch from '../bugzilla/BugzillaSearch'
import Collapse from '@material-ui/core/Collapse'
import Divider from '@material-ui/core/Divider'
import ExitToAppIcon from '@material-ui/icons/ExitToApp'
import HomeIcon from '@material-ui/icons/Home'
import InfoIcon from '@material-ui/icons/Info'
import List from '@material-ui/core/List'
import ListIcon from '@material-ui/icons/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemText from '@material-ui/core/ListItemText'
import NewReleasesIcon from '@material-ui/icons/NewReleases'
import PropTypes from 'prop-types'
import React, { Fragment } from 'react'
import SearchIcon from '@material-ui/icons/Search'
import SippyLogo from './SippyLogo'
import TableChartIcon from '@material-ui/icons/TableChart'

export default function Sidebar(props) {
  const classes = useTheme()

  const [bugzillaOpen, setBugzillaOpen] = React.useState(false)
  const [open, setOpen] = React.useState({ 0: true })

  const handleBugzillaOpen = () => {
    setBugzillaOpen(true)
  }

  const handleBugzillaClose = () => {
    setBugzillaOpen(false)
  }

  function handleClick(id) {
    setOpen((prevState) => ({ ...prevState, [id]: !prevState[id] }))
  }

  return (
    <Fragment>
      <List>
        <ListItem button component={Link} to="/" key="Home">
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary="Home" />
        </ListItem>
      </List>
      <Divider />
      <List
        subheader={
          <ListSubheader component="div" id="releases">
            Releases
          </ListSubheader>
        }
      >
        {props.releases.map((release, index) => (
          <Fragment key={'section-release-' + index}>
            <ListItem
              key={'item-release-' + index}
              button
              onClick={() => handleClick(index)}
            >
              {open[index] ? <ExpandLess /> : <ExpandMore />}
              <ListItemText primary={release} />
            </ListItem>
            <Collapse in={open[index]} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItem
                  key={'release-overview-' + index}
                  component={Link}
                  to={'/release/' + release}
                  button
                  className={classes.nested}
                >
                  <ListItemIcon>
                    <InfoIcon />
                  </ListItemIcon>
                  <ListItemText primary="Overview" />
                </ListItem>
                <CapabilitiesContext.Consumer>
                  {(value) => {
                    if (value.includes('openshift_releases')) {
                      return (
                        <ListItem
                          key={'release-tags-' + index}
                          component={Link}
                          to={`/release/${release}/tags`}
                          button
                          className={classes.nested}
                        >
                          <ListItemIcon>
                            <FileCopyOutlined />
                          </ListItemIcon>
                          <ListItemText primary="Payloads" />
                        </ListItem>
                      )
                    }
                  }}
                </CapabilitiesContext.Consumer>
                <ListItem
                  key={'release-jobs-' + index}
                  component={Link}
                  to={withSort(
                    pathForJobsWithFilter(release, {
                      items: withoutUnstable(),
                    }),
                    'net_improvement',
                    'asc'
                  )}
                  button
                  className={classes.nested}
                >
                  <ListItemIcon>
                    <ListIcon />
                  </ListItemIcon>
                  <ListItemText primary="Jobs" />
                </ListItem>
                <ListItem
                  key={'release-tests-' + index}
                  component={Link}
                  to={withSort(
                    pathForTestsWithFilter(release, {
                      items: [
                        BOOKMARKS.RUN_7,
                        BOOKMARKS.NO_NEVER_STABLE,
                        BOOKMARKS.NO_TECHPREVIEW,
                        BOOKMARKS.WITHOUT_OVERALL_JOB_RESULT,
                        BOOKMARKS.NO_STEP_GRAPH,
                      ],
                      linkOperator: 'and',
                    }),
                    'current_working_percentage',
                    'asc'
                  )}
                  button
                  className={classes.nested}
                >
                  <ListItemIcon>
                    <SearchIcon />
                  </ListItemIcon>
                  <ListItemText primary="Tests" />
                </ListItem>

                <CapabilitiesContext.Consumer>
                  {(value) => {
                    if (value.includes('openshift_releases')) {
                      return (
                        <ListItem
                          key={'release-upgrade-' + index}
                          component={Link}
                          to={'/upgrade/' + release}
                          button
                          className={classes.nested}
                        >
                          <ListItemIcon>
                            <ArrowUpwardIcon />
                          </ListItemIcon>
                          <ListItemText primary="Upgrade" />
                        </ListItem>
                      )
                    }
                  }}
                </CapabilitiesContext.Consumer>

                <CapabilitiesContext.Consumer>
                  {(value) => {
                    if (value.includes('openshift_releases')) {
                      return (
                        <ListItem
                          key={'release-install-' + index}
                          component={Link}
                          to={'/install/' + release}
                          button
                          className={classes.nested}
                        >
                          <ListItemIcon>
                            <ExitToAppIcon />
                          </ListItemIcon>
                          <ListItemText primary="Install" />
                        </ListItem>
                      )
                    }
                  }}
                </CapabilitiesContext.Consumer>

                <CapabilitiesContext.Consumer>
                  {(value) => {
                    if (value.includes('openshift_releases')) {
                      return (
                        <ListItem
                          key={'release-infrastructure-' + index}
                          component={Link}
                          to={
                            '/tests/' +
                            release +
                            '/details?test=[sig-sippy] infrastructure should work'
                          }
                          button
                          className={classes.nested}
                        >
                          <ListItemIcon>
                            <ApartmentIcon />
                          </ListItemIcon>
                          <ListItemText primary="Infrastructure" />
                        </ListItem>
                      )
                    }
                  }}
                </CapabilitiesContext.Consumer>
              </List>
            </Collapse>
          </Fragment>
        ))}
      </List>
      <Divider />
      <List
        subheader={
          <ListSubheader component="div" id="resources">
            Resources
          </ListSubheader>
        }
      >
        <CapabilitiesContext.Consumer>
          {(value) => {
            if (value.includes('openshift_releases')) {
              return (
                <ListItem
                  button
                  component="a"
                  href="https://testgrid.k8s.io/redhat"
                  target="_blank"
                  key="TestGrid"
                >
                  <ListItemIcon>
                    <AssessmentIcon />
                  </ListItemIcon>
                  <ListItemText primary="TestGrid" />
                </ListItem>
              )
            } else {
              return (
                <ListItem
                  button
                  component="a"
                  href="https://testgrid.k8s.io/sig-release"
                  target="_blank"
                  key="TestGrid"
                >
                  <ListItemIcon>
                    <AssessmentIcon />
                  </ListItemIcon>
                  <ListItemText primary="TestGrid" />
                </ListItem>
              )
            }
          }}
        </CapabilitiesContext.Consumer>

        <CapabilitiesContext.Consumer>
          {(value) => {
            if (value.includes('openshift_releases')) {
              return (
                <ListItem
                  button
                  component="a"
                  href="https://amd64.ocp.releases.ci.openshift.org/"
                  target="_blank"
                  key="ReleaseController"
                >
                  <ListItemIcon>
                    <NewReleasesIcon />
                  </ListItemIcon>
                  <ListItemText primary="Release Controller" />
                </ListItem>
              )
            }
          }}
        </CapabilitiesContext.Consumer>

        <CapabilitiesContext.Consumer>
          {(value) => {
            if (value.includes('openshift_releases')) {
              return (
                <ListItem
                  button
                  onClick={handleBugzillaOpen}
                  key="SearchBugzilla"
                >
                  <ListItemIcon>
                    <BugReport />
                  </ListItemIcon>
                  <ListItemText primary="Search Bugzilla" />
                </ListItem>
              )
            }
          }}
        </CapabilitiesContext.Consumer>

        <CapabilitiesContext.Consumer>
          {(value) => {
            if (value.includes('openshift_releases')) {
              return (
                <BugzillaSearch
                  open={handleBugzillaOpen}
                  close={handleBugzillaClose}
                  isOpen={bugzillaOpen}
                />
              )
            }
          }}
        </CapabilitiesContext.Consumer>

        <ListItem
          button
          component="a"
          target="_blank"
          href="https://www.github.com/openshift/sippy"
          key="GitHub"
        >
          <ListItemIcon>
            <GitHub />
          </ListItemIcon>
          <ListItemText primary="GitHub Repo" />
        </ListItem>
        <Divider />
        <div align="center">
          <SippyLogo />
        </div>
      </List>
    </Fragment>
  )
}

Sidebar.propTypes = {
  releases: PropTypes.array,
}
