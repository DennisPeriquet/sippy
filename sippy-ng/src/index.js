import './index.css'
import { BrowserRouter as Router } from 'react-router-dom'
import App from './App'
import React from 'react'
import ReactDOM from 'react-dom'

ReactDOM.render(
  <Router basename="/sippy-ng/">
    <App />
  </Router>,
  document.getElementById('root')
)
