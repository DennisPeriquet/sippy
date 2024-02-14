import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material'
import { CompReadyVarsContext } from './CompReadyVars'
import { Save, ViewCarousel } from '@mui/icons-material'
import PropTypes from 'prop-types'
import React, { Fragment, useContext, useState } from 'react'

export default function SavedViews(props) {
  const [anchor, setAnchor] = React.useState('')
  const [buttonName, setButtonName] = React.useState(props.view)

  const maxSavedViewLength = 15
  const setViewParam = props.setViewParam
  const views = props.views
  const setViews = props.setViews

  setViewParam(buttonName)
  const handleClick = (event) => {
    setAnchor(event.currentTarget)
    setViewParam(buttonName)
  }

  const handleClose = () => {
    setAnchor(null)
  }

  const [isDialogOpen, setDialogOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const [newViewDescription, setNewViewDescription] = useState('')

  const handleOpenDialog = () => {
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
  }

  const varsContext = useContext(CompReadyVarsContext)

  const handleSaveView = () => {
    if (newViewName.length > 0) {
      const newViewConfig = {
        config: {
          help: newViewDescription,
          'Group By': varsContext.groupByCheckedItems,
          'Exclude Arches': varsContext.excludeArchesCheckedItems,
          'Exclude Networks': varsContext.excludeNetworksCheckedItems,
          'Exclude Clouds': varsContext.excludeCloudsCheckedItems,
          'Exclude Upgrades': varsContext.excludeUpgradesCheckedItems,
          'Exclude Variants': varsContext.excludeVariantsCheckedItems,
          Confidence: varsContext.confidence,
          Pity: varsContext.pity,
          'Min Fail': varsContext.minFail,
          'Ignore Missing': varsContext.ignoreMissing,
          'Ignore Disruption': varsContext.ignoreDisruption,
        },
      }

      // Append the new view to the existing views.
      const newViews = {
        ...views,
        [newViewName]: newViewConfig,
      }
      setViews(newViews)
      handleCloseDialog()
    }
  }

  return (
    <Fragment>
      <Button
        aria-controls="view-menu"
        aria-haspopup="true"
        startIcon={<ViewCarousel />}
        color="primary"
        onClick={handleClick}
      >
        <Tooltip title={views[buttonName].config.help}>
          View: {buttonName}
        </Tooltip>
      </Button>
      <Menu
        id="view-menu"
        anchorEl={anchor}
        keepMounted
        open={Boolean(anchor)}
        onClose={handleClose}
      >
        {Object.entries(props.views).map(([e, v]) => (
          <MenuItem
            key={e}
            style={{
              fontWeight: props.view === e ? 'bold' : 'normal',
            }}
            onClick={() => {
              props.applyView(e)
              setButtonName(e)
              handleClose()
            }}
          >
            <Tooltip title={views[e].config.help}>{e}</Tooltip>
          </MenuItem>
        ))}
      </Menu>

      <Button color="primary" startIcon={<Save />} onClick={handleOpenDialog}>
        Save Current View
      </Button>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>Save Current View</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Name for new view (max {maxSavedViewLength} characters)
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="view-name"
            label="New View Name"
            type="text"
            fullWidth
            inputProps={{ maxLength: maxSavedViewLength }}
            value={newViewName}
            onChange={(event) => setNewViewName(event.target.value)}
          />
          <TextField
            margin="dense"
            id="view-description"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={newViewDescription}
            onChange={(event) => setNewViewDescription(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSaveView} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Fragment>
  )
}

SavedViews.propTypes = {
  view: PropTypes.string,
  views: PropTypes.object,
  setViews: PropTypes.func.isRequired,
  applyView: PropTypes.func.isRequired,
  viewParam: PropTypes.string.isRequired,
  setViewParam: PropTypes.func.isRequired,
}
