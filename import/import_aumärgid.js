require('dotenv').config()
const token = process.env.ENTU_TOKEN

const fs = require('fs')
const csv = require('csv-parser')
const path = require('path')
const entu_hostname = 'entu.app/api'
const entu_account = 'esmuuseum'

const result_csv_path = path.parse(__filename).dir + '/import_aumärgid_results.csv'
const result_stream = fs.createWriteStream(result_csv_path)
// const aumärgid_csv_path = path.parse(__filename).dir + '/test.csv'
const aumärgid_csv_path = path.parse(__filename).dir + '/VR Kavalerid puhtand - aumärgid.csv'
const aumärgid_entu_type = {'type': '_type', 'string': 'vr_aum2rk', 'reference': '66b625807efc9ac06a437be3'}

var counter = 0
const full_trshold = 42
const low_trshold = 36
var paused = false

const instream = fs.createReadStream(aumärgid_csv_path)
  .pipe(csv())
  .on('data', (csv_data) => {
    counter ++
    if (counter > full_trshold) {
      // console.log('Pressing breaks...')
      instream.pause()
      paused = true
    }
    // 2. POST new entites and save result ID's
    console.log(`Adding new entity for ${csv_data.vr_id}, kavaler: ${csv_data.Kavaler_eid}`)
    fetch(
      `https://${entu_hostname}/${entu_account}/entity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          aumärgid_entu_type,
          {type: 'kavaler', reference: csv_data.Kavaler_eid},
          {type: 'vr_nr', string: csv_data.VR_Nr},
          {type: 'liik_ja_j2rk', string: csv_data.Liik_ja_järk},
          {type: 'otsuse_kp', string: csv_data.Otsus_kp},
          {type: 't2psustus', string: csv_data.Täpsustus},
          {type: 'otsuse_tekst', string: csv_data.Otsus_tekst},
          {type: 'vr_id', string: csv_data.vr_id},
          {type: 'kavaler_vr_id', string: csv_data.Kavaler_id},
        ])
      }
    )
    .then(response => response.json())
    .then(json_data => {
      // console.log(`Response data: ${JSON.stringify(json_data)}`)
      let new_id = json_data._id
      // 3. aggregate new entity
      fetch(`https://${entu_hostname}/${entu_account}/entity/${new_id}/aggregate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(json_data => {
        // console.log(JSON.stringify(json_data, null, 2))
        counter--
        if (counter < low_trshold && paused) {
          // console.log('Resuming...')
          instream.resume()
          paused = false
        }
        // 4. Save results to 'import_kavalerid_results.csv'
        result_stream.write(`${csv_data.vr_id},${new_id}\n`)
        console.log(`Added new entity: ${new_id} for nr: ${csv_data.vr_id}`)
      })
    })
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
  })


