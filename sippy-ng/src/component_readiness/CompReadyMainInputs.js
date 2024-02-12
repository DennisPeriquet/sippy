import './ComponentReadiness.css'
import { CompReadyVarsContext } from './CompReadyVars'
import {
  dateFormat,
  formatLongDate,
  getUpdatedUrlParts,
  groupByList,
} from './CompReadyUtils'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { makeStyles, useTheme } from '@mui/styles'
import AdvancedOptions from './AdvancedOptions'
import Button from '@mui/material/Button'
import CheckBoxList from './CheckboxList'
import PropTypes from 'prop-types'
import React, { useContext, useState } from 'react'
import ReleaseSelector from './ReleaseSelector'
import SavedViews from './SavedViews'
import Tooltip from '@mui/material/Tooltip'

const useStyles = makeStyles((theme) => ({
  crRelease: {
    textAlign: 'center',
    marginBottom: 50,
    fontWeight: 'bold',
    padding: 5,
    backgroundColor:
      theme.palette.mode == 'dark'
        ? theme.palette.grey[800]
        : theme.palette.grey[300],
  },
}))

export default function CompReadyMainInputs(props) {
  const theme = useTheme()
  const classes = useStyles(theme)

  const varsContext = useContext(CompReadyVarsContext)

  const [views, setViews] = useState([
    {
      id: 'Default',
      name: 'Default',
      config: {
        'Group By': varsContext.defaultGroupByCheckedItems,
        'Exclude Arches': varsContext.defaultExcludeArchesCheckedItems,
        'Exclude Networks': varsContext.defaultExcludeNetworksCheckedItems,
        'Exclude Clouds': varsContext.defaultExcludeCloudsCheckedItems,
        'Exclude Upgrades': varsContext.defaultExcludeUpgradesCheckedItems,
        'Exclude Variants': varsContext.defaultExcludeVariantsCheckedItems,
        Confidence: varsContext.defaultConfidenceParam,
        Pity: varsContext.defaultPityParam,
        'Min Fail': varsContext.defaultMinFailParam,
        'Ignore Missing': varsContext.defaultIgnoreMissingParam,
        'Ignore Disruption': varsContext.defaultIgnoreDisruptionParam,
      },
    },
    {
      id: 'View1',
      name: 'View1',
      config: {
        /* ...View1 config */
      },
    },
    {
      id: 'View2',
      name: 'View2',
      config: {
        /* ...View2 config */
      },
    },
  ])

  const handleSelectView = (view) => {
    // Update UI and regenerate report based on the selected view
  }

  const handleDeleteView = (viewId) => {
    // Delete view from the state and possibly from local storage/backend
    setViews(views.filter((view) => view.id !== viewId))
  }

  const handleSaveView = (viewConfig) => {
    // Serialize and save the view configuration
    const newView = {
      id: Date.now(), // or another unique identifier
      name: `View ${views.length + 1}`,
      config: viewConfig,
    }
    setViews([...views, newView])
    // Also save to local storage/backend here
  }

  return (
    <Fragment>
      <div className="cr-report-button">
        <Button
          size="large"
          variant="contained"
          color="primary"
          to={
            '/component_readiness/main' +
            getUpdatedUrlParts(
              varsContext.baseRelease,
              varsContext.baseStartTime,
              varsContext.baseEndTime,
              varsContext.sampleRelease,
              varsContext.sampleStartTime,
              varsContext.sampleEndTime,
              varsContext.groupByCheckedItems,
              varsContext.excludeCloudsCheckedItems,
              varsContext.excludeArchesCheckedItems,
              varsContext.excludeNetworksCheckedItems,
              varsContext.excludeUpgradesCheckedItems,
              varsContext.excludeVariantsCheckedItems,
              varsContext.confidence,
              varsContext.pity,
              varsContext.minFail,
              varsContext.ignoreDisruption,
              varsContext.ignoreMissing
            )
          }
          onClick={varsContext.handleGenerateReport}
        >
          <Tooltip
            title={
              'Click here to generate a report that compares the release you wish to evaluate\
               against a historical (previous) release'
            }
          >
            <Fragment>Generate Report</Fragment>
          </Tooltip>
        </Button>
      </div>

      <div className={classes.crRelease}>
        <ReleaseSelector
          label="Release to Evaluate"
          version={varsContext.sampleRelease}
          onChange={varsContext.setSampleReleaseWithDates}
          startTime={formatLongDate(varsContext.sampleStartTime, dateFormat)}
          setStartTime={varsContext.setSampleStartTime}
          endTime={formatLongDate(varsContext.sampleEndTime, dateFormat)}
          setEndTime={varsContext.setSampleEndTime}
        ></ReleaseSelector>
      </div>
      <div className={classes.crRelease}>
        <ReleaseSelector
          version={varsContext.baseRelease}
          label="Historical Release"
          onChange={varsContext.setBaseReleaseWithDates}
          startTime={formatLongDate(varsContext.baseStartTime, dateFormat)}
          setStartTime={varsContext.setBaseStartTime}
          endTime={formatLongDate(varsContext.baseEndTime, dateFormat)}
          setEndTime={varsContext.setBaseEndTime}
        ></ReleaseSelector>
      </div>
      <div>
        <SavedViews
          views={views}
          onSelectView={handleSelectView}
          onDeleteView={handleDeleteView}
        />
        <CheckBoxList
          headerName="Group By"
          displayList={groupByList}
          checkedItems={varsContext.groupByCheckedItems}
          setCheckedItems={varsContext.setGroupByCheckedItems}
        ></CheckBoxList>
        <CheckBoxList
          headerName="Exclude Arches"
          displayList={varsContext.excludeArchesList}
          checkedItems={varsContext.excludeArchesCheckedItems}
          setCheckedItems={varsContext.setExcludeArchesCheckedItems}
        ></CheckBoxList>
        <CheckBoxList
          headerName="Exclude Networks"
          displayList={varsContext.excludeNetworksList}
          checkedItems={varsContext.excludeNetworksCheckedItems}
          setCheckedItems={varsContext.setExcludeNetworksCheckedItems}
        ></CheckBoxList>
        <CheckBoxList
          headerName="Exclude Clouds"
          displayList={varsContext.excludeCloudsList}
          checkedItems={varsContext.excludeCloudsCheckedItems}
          setCheckedItems={varsContext.setExcludeCloudsCheckedItems}
        ></CheckBoxList>
        <CheckBoxList
          headerName="Exclude Upgrades"
          displayList={varsContext.excludeUpgradesList}
          checkedItems={varsContext.excludeUpgradesCheckedItems}
          setCheckedItems={varsContext.setExcludeUpgradesCheckedItems}
        ></CheckBoxList>
        <CheckBoxList
          headerName="Exclude Variants"
          displayList={varsContext.excludeVariantsList}
          checkedItems={varsContext.excludeVariantsCheckedItems}
          setCheckedItems={varsContext.setExcludeVariantsCheckedItems}
        ></CheckBoxList>
        <AdvancedOptions
          headerName="Advanced"
          confidence={varsContext.confidence}
          pity={varsContext.pity}
          minFail={varsContext.minFail}
          ignoreMissing={varsContext.ignoreMissing}
          ignoreDisruption={varsContext.ignoreDisruption}
          setConfidence={varsContext.setConfidence}
          setPity={varsContext.setPity}
          setMinFail={varsContext.setMinFail}
          setIgnoreMissing={varsContext.setIgnoreMissing}
          setIgnoreDisruption={varsContext.setIgnoreDisruption}
        ></AdvancedOptions>
      </div>
    </Fragment>
  )
}

// component and environment may be null so they are not required
CompReadyMainInputs.propTypes = {}
