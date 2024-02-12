import './SavedViews.css'
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { makeStyles } from '@mui/styles'
import PropTypes from 'prop-types'
import React, { useState } from 'react'

export default function SavedViews(props) {
  const { views, onSelectView, onDeleteView } = props

  const [selectedView, setSelectedView] = useState('Default')

  const handleChange = (event) => {
    const viewName = event.target.value
    setSelectedView(viewName)
    const view = views.find((v) => v.name === viewName)
    onSelectView(view)
  }

  return (
    <FormControl variant="outlined" fullWidth>
      <InputLabel id="saved-views-label">
        <Typography className="savedviews-label">Selected View</Typography>
      </InputLabel>
      <Select
        labelId="saved-views-label"
        id="saved-views-select"
        value={selectedView}
        label="Selected View"
        onChange={handleChange}
      >
        {views.map((view) => (
          <MenuItem key={view.id} value={view.name}>
            {view.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

SavedViews.propTypes = {
  views: PropTypes.array.isRequired,
  onSelectView: PropTypes.func.isRequired,
  onDeleteView: PropTypes.func.isRequired,
}
