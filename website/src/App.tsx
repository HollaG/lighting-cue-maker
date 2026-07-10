import { Box, Button } from '@mantine/core'
import { useState } from 'react'

import classes from './App.module.css'
import { HomeHeader } from './components/HomeHeader/HomeHeader'

// When the app loads, if query parameter showId is not present, render a CTA
// if showId is present, load the Google Doc corresponding to that showId
function App() {
  const [count, setCount] = useState(0)



  return (
    <Box>
      <Box className={classes.controlBar}>
        <Button variant='light'>Night mode</Button>
      </Box>

      <HomeHeader show />

    </Box>
  )
}

export default App
