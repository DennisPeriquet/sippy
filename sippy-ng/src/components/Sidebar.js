import { BOOKMARKS } from '../constants'
import {
  BugReport,
  Code,
  ExpandLess,
  ExpandMore,
  Favorite,
  FileCopyOutlined,
  GitHub,
  Restore,
} from '@material-ui/icons'
import { CapabilitiesContext } from '../App'
import { Link, useLocation } from 'react-router-dom'
import { ListSubheader, Tooltip, useTheme } from '@material-ui/core'
import {
  pathForJobsWithFilter,
  pathForTestsWithFilter,
  safeEncodeURIComponent,
  withoutUnstable,
  withSort,
} from '../helpers'
import { pathForTestByVariant, useNewInstallTests } from '../helpers'
import ApartmentIcon from '@material-ui/icons/Apartment'
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward'
import AssessmentIcon from '@material-ui/icons/Assessment'
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
import React, { Fragment, useEffect } from 'react'
import SearchIcon from '@material-ui/icons/Search'
import SippyLogo from './SippyLogo'

export default function Sidebar(props) {
  const classes = useTheme()
  const theLocation = useLocation()

  const [isOpen, setIsOpen] = React.useState({})

  useEffect(() => {
    return () => {
      // infer release from current url when loading sidebar for first time
      let parts = theLocation.pathname.split('/')
      let tmpOpen = isOpen
      if (parts.length >= 3) {
        let index = props.releases.indexOf(parts[2])
        if (index !== -1) {
          tmpOpen[index] = true
        }
      } else {
        tmpOpen[0] = true
      }
      setIsOpen(tmpOpen)
    }
  }, [props])

  function handleClick(id) {
    setIsOpen((prevState) => ({ ...prevState, [id]: !prevState[id] }))
  }

  function reportAnIssueURI() {
    const description = `Describe your feature request or bug:\n\n
    
    Relevant Sippy URL:\n
    ${window.location.href}\n\n`
    return `https://issues.redhat.com/secure/CreateIssueDetails!init.jspa?priority=10200&pid=12323832&issuetype=17&description=${safeEncodeURIComponent(
      description
    )}`
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
      <CapabilitiesContext.Consumer>
        {(value) => {
          if (value.includes('build_clusters')) {
            return (
              <Fragment>
                <Divider />
                <List
                  subheader={
                    <ListSubheader component="div" id="infrastructure">
                      Infrastructure
                    </ListSubheader>
                  }
                >
                  <ListItem
                    key={'build-cluster-health'}
                    component={Link}
                    to={`/build_clusters`}
                    button
                    className={classes.nested}
                  >
                    <ListItemIcon>
                      <Favorite />
                    </ListItemIcon>
                    <ListItemText primary="Build Cluster Health" />
                  </ListItem>
                </List>
              </Fragment>
            )
          }
        }}
      </CapabilitiesContext.Consumer>
      <CapabilitiesContext.Consumer>
        {(value) => {
          if (value.includes('openshift_releases')) {
            return (
              <Fragment>
                <Divider />
                <List
                  subheader={
                    <ListSubheader component="div" id="Overall Components">
                      Experimental
                    </ListSubheader>
                  }
                >
                  <ListItem
                    key={'release-health-'}
                    component={Link}
                    to={'/component_readiness/main'}
                    button
                    className={classes.nested}
                  >
                    <ListItemIcon>
                      <Tooltip title="This functionality is experimental; please do NOT depend on this data">
                        <InfoIcon />
                      </Tooltip>
                    </ListItemIcon>
                    <ListItemText primary="Component Readiness" />
                  </ListItem>
                </List>
              </Fragment>
            )
          }
        }}
      </CapabilitiesContext.Consumer>
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
              {isOpen[index] ? <ExpandLess /> : <ExpandMore />}
              <ListItemText primary={release} />
            </ListItem>
            <Collapse in={isOpen[index]} timeout="auto" unmountOnExit>
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
                {release !== 'Presubmits' ? (
                  <CapabilitiesContext.Consumer>
                    {(value) => {
                      if (value.includes('openshift_releases')) {
                        return (
                          <ListItem
                            key={'release-tags-' + index}
                            component={Link}
                            to={`/release/${release}/streams`}
                            button
                            className={classes.nested}
                          >
                            <ListItemIcon>
                              <FileCopyOutlined />
                            </ListItemIcon>
                            <ListItemText primary="Payload Streams" />
                          </ListItem>
                        )
                      }
                    }}
                  </CapabilitiesContext.Consumer>
                ) : (
                  ''
                )}
                <ListItem
                  key={'release-jobs-' + index}
                  component={Link}
                  to={withSort(
                    pathForJobsWithFilter(release, {
                      items: [BOOKMARKS.RUN_7, ...withoutUnstable()],
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

                {
                  // FIXME: Base this on something like a per-release capabilities feature instead.
                  release === 'Presubmits' ? (
                    <Fragment>
                      <ListItem
                        key={'release-pull-requests-' + index}
                        component={Link}
                        to={`/pull_requests/${release}`}
                        button
                        className={classes.nested}
                      >
                        <ListItemIcon>
                          <GitHub />
                        </ListItemIcon>
                        <ListItemText primary="Pull Requests" />
                      </ListItem>
                      <ListItem
                        key={'release-repositories-' + index}
                        component={Link}
                        to={`/repositories/${release}`}
                        button
                        className={classes.nested}
                      >
                        <ListItemIcon>
                          <Code />
                        </ListItemIcon>
                        <ListItemText primary="Repositories" />
                      </ListItem>
                    </Fragment>
                  ) : (
                    ''
                  )
                }

                <ListItem
                  key={'release-tests-' + index}
                  component={Link}
                  to={withSort(
                    pathForTestsWithFilter(release, {
                      items: [
                        BOOKMARKS.RUN_7,
                        BOOKMARKS.NO_NEVER_STABLE,
                        BOOKMARKS.NO_AGGREGATED,
                        BOOKMARKS.WITHOUT_OVERALL_JOB_RESULT,
                        BOOKMARKS.NO_STEP_GRAPH,
                        BOOKMARKS.NO_OPENSHIFT_TESTS_SHOULD_WORK,
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
                      let newInstall = useNewInstallTests(release)
                      let link
                      if (newInstall) {
                        link = pathForTestByVariant(
                          release,
                          'cluster install.install should succeed: infrastructure'
                        )
                      } else {
                        link = pathForTestByVariant(
                          release,
                          '[sig-sippy] infrastructure should work'
                        )
                      }

                      return (
                        <ListItem
                          key={'release-infrastructure-' + index}
                          component={Link}
                          to={link}
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
        <ListItem
          button
          component="a"
          target="_blank"
          href={reportAnIssueURI()}
          key="ReportAnIssue"
        >
          <ListItemIcon>
            <BugReport />
          </ListItemIcon>
          <ListItemText primary="Report an Issue" />
        </ListItem>

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
