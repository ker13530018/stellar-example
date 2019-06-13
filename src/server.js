import express from 'express'
import bodyParser from 'body-parser'
import stellarRouter from './stellar'

const app = express()
const port = process.env.PORT || 3000

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', (req, res) => {
  return res.json({
    message: 'Hello world.',
  })
})

app.use('/api/v1', stellarRouter)

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})
