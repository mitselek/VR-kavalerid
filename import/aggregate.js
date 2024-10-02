require('dotenv').config()
const token = process.env.ENTU_TOKEN

const { Readable } = require('node:stream')
const readable = new Readable()

const entu_hostname = 'entu.app/api'
const entu_account = 'esmuuseum'

const fetch_limit = 10000
const list_vrk = `https://${entu_hostname}/${entu_account}/entity?_type.string=vr_kavaler&props=_id&limit=${fetch_limit}`
const list_vr = `https://${entu_hostname}/${entu_account}/entity?_type.string=vr_aum2rk&props=_id&limit=${fetch_limit}`
const aggregate_v = `https://${entu_hostname}/${entu_account}/entity/` // entu_id/aggregate

let counter = 0
const full_trshold = 50
const low_trshold = 20
var paused = false

fetch(list_vrk, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept-Encoding': 'deflate'
  }
})
.then(response => response.json())
.then(data => data.entities.map(entity => entity._id))
.then(eid_a => {
  eid_a.forEach(eid => {
    readable.push(eid)
  })
  readable.push(null)

  readable.on('data', (eid) => {
    counter ++
    if (counter > full_trshold) {
      console.log('Pressing breaks...')
      readable.pause()
      paused = true
    }

    const url = `${aggregate_v}${eid}/aggregate`
    // console.log(url)
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept-Encoding': 'deflate'
      }
    })
    .then(response => {
      counter--
      if (counter < low_trshold && paused) {
        console.log('Resuming...')
        readable.resume()
        paused = false
      }
    })
  })
})