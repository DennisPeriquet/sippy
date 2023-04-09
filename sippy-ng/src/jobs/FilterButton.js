import { Button } from '@material-ui/core'
import PropTypes from 'prop-types'
import React from 'react'

export default function FilterButton(props) {
  const mapKey = props.key1
  const value = props.value

  const handleClick = (event) => {
    //console.log(event.target.outerText)
    console.log(event.target.innerText)
  }

  //const letter = 'F'
  const spanText = `result result-${mapKey}`
  return (
    <Button key={mapKey} name="button" onClick={handleClick}>
      <span className="legend-item">
        <span className="results results-demo">
          <span className={spanText}>{mapKey}</span>
        </span>{' '}
      </span>
      {value}
    </Button>
  )
}

FilterButton.propTypes = {
  key1: PropTypes.string,
  value: PropTypes.string,
}
