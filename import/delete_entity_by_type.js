require('dotenv').config()
const token = process.env.ENTU_TOKEN

const { Readable } = require('node:stream')
const readable = new Readable()

const { stdout } = require('node:process')

const entu_hostname = 'entu.app/api'
const entu_account = 'esmuuseum'

const entity_type = 'vr_kavaler'
// const entity_type = 'vr_aum2rk'

const fetch_limit = 10000
const list_v = `https://${entu_hostname}/${entu_account}/entity?_type.string=${entity_type}&props=_id&limit=${fetch_limit}`
const delete_v = `https://${entu_hostname}/${entu_account}/entity/`
// console.log(list_v)

let counter = 0
const full_trshold = 50
const low_trshold = 40
var paused = false
var total = 0

fetch(list_v, {
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
    total++
    readable.push(eid)
  })
  readable.push(null)

  var i = 1
  readable.on('data', (eid) => {
    counter ++
    if (counter > full_trshold) {
      // console.log('Pressing breaks...')
      readable.pause()
      paused = true
    }

    const url = `${delete_v}${eid}`
    // console.log(url)
    fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept-Encoding': 'deflate'
      }
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
}) 

var last_percentage = 0
const progress = (processed, total) => {
  const current_percentage = Math.floor(processed / total * 100)
  if (current_percentage > last_percentage) {
    last_percentage = current_percentage
    stdout.write(`Processed ${processed} of ${total} (${current_percentage}%)\n`)
  }
}
