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
    <div>
      <label htmlFor="saved-views-dropdown">Selected View</label>
      <select value={selectedView} onChange={handleChange}>
        <option value="Default">Default</option>
        {views.map((view) => (
          <option key={view.id} value={view.name}>
            {view.name}
          </option>
        ))}
      </select>
    </div>
  )
}

SavedViews.propTypes = {
  views: PropTypes.array.isRequired,
  onSelectView: PropTypes.func.isRequired,
  onDeleteView: PropTypes.func.isRequired,
}
