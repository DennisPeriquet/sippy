import { withStyles } from '@material-ui/core/styles'
import AppBar from '@material-ui/core/AppBar'
import Button from '@material-ui/core/Button'
import Card from '@material-ui/core/Card'
import CardActions from '@material-ui/core/CardActions'
import CardContent from '@material-ui/core/CardContent'
import CardMedia from '@material-ui/core/CardMedia'
import Container from '@material-ui/core/Container'
import CssBaseline from '@material-ui/core/CssBaseline'
import Grid from '@material-ui/core/Grid'
import PhotoCamera from '@material-ui/icons/PhotoCamera'
import React from 'react'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import useStyles from './styles'

const cards = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const Testing2 = () => {
  const classes = useStyles()
  return (
    <div>
      <CssBaseline />
      <AppBar position="relative">
        <Toolbar>
          <PhotoCamera className={classes.icons} />
          <Typography variant="h6">Photos</Typography>
        </Toolbar>
      </AppBar>
      <main>
        <div className="classes.container">
          <Container maxWidth="sm" style={{ marginTop: '100px' }}>
            <Typography variant="h2" align="center" color="textPrimary">
              Photo Album
            </Typography>
            <Typography variant="h5" align="center" color="textSecondary">
              Hello everyone, this is a photo album and I&apos;m trying to make
              a long paragraph example.
            </Typography>
            <div className={classes.buttons}>
              <Grid container spacing={4} justifyContent="center">
                <Grid item>
                  <Button variant="contained" color="primary">
                    See my photos
                  </Button>
                  <Button variant="contained" color="primary">
                    See photo details
                  </Button>
                </Grid>
              </Grid>
            </div>
          </Container>
        </div>
        <Container className={classes.cardGrid} maxWidth="md">
          <Grid container spacing={4}>
            {cards.map((card, index) => (
              <Grid item key={index}>
                <Card className={classes.card}>
                  <CardMedia
                    className={classes.cardMedia}
                    image="https://source.unsplash.com/random"
                    title="Image example title"
                  />
                  <CardContent className={classes.CardContent}>
                    <Typography gutterBottom variant="h5">
                      Heading
                    </Typography>
                    <Typography>
                      This is a media card. Use this to describe the content.
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="sm" color="primary">
                      View
                    </Button>
                    <Button size="sm" color="primary">
                      Edit
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </main>
    </div>
  )
}

export default Testing2
