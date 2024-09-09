require('dotenv').config()
const token = process.env.ENTU_TOKEN

const fs = require('fs')
const csv = require('csv-parser')
const path = require('path')
const { stdout } = require('node:process')

const entu_hostname = 'entu.app/api'
const entu_account = 'esmuuseum'

const update_url = `https://${entu_hostname}/${entu_account}/entity/`

// const in_csv_path = path.join(__dirname, 'VRkavalerid_Bio.csv')
const in_csv_path = path.join(__dirname, 'mille_eest.csv')

const field_mapping = [
  {
    source: 'isa_ema',
    target: 'ema_isa',
    type: 'string'
  },
  {
    source: 'amet',
    target: 'amet',
    type: 'string'
  },
  {
    source: 'bio',
    target: 'biography',
    type: 'string'
  },
  {
    source: 'mille_eest',
    target: 'mille_eest',
    type: 'string'
  }
]

let counter = 0
const full_trshold = 50
const low_trshold = 40
var paused = false
var total = 3313

const instream = fs.createReadStream(in_csv_path)
const readable = instream.pipe(csv())

var i = 1
readable.on('data', (data) => {
  counter++
  if (counter > full_trshold) {
    // console.log('Pressing breaks...')
    readable.pause()
    paused = true
  }
  // console.log(`row ${counter} data ${JSON.stringify(data)}`)

  const eid = data['eid']

  let body_a = []
  for (key in field_mapping) {
    const mapping = field_mapping[key]
    if (data[mapping.source]) {
      property = {type: mapping.target}
      property[mapping.type] = data[mapping.source]
      body_a.push(property)
    }
  }

  const url = `${update_url}${eid}`
  // console.log(url, JSON.stringify(body_a))
  fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body_a)
  })
    .then(response => response.json())
    .then(data => {
      progress(i++, total)
      // console.log(data)
      counter--
      if (counter < low_trshold && paused) {
        // console.log('Resuming...')
        readable.resume()
        paused = false
      }
    })
})


var last_percentage = 0
const progress = (processed, total) => {
  const current_percentage = Math.floor(processed / total * 100)
  if (current_percentage > last_percentage) {
    last_percentage = current_percentage
    stdout.write(`Processed ${processed} of ${total} (${current_percentage}%)\n`)
  }
}

