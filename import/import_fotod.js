require('dotenv').config()
const token = process.env.ENTU_TOKEN

const fs = require('fs')
const csv = require('csv-parser')
const path = require('path')
const entu_hostname = 'entu.app/api'
const entu_account = 'esmuuseum'

const result_csv_path = path.parse(__filename).dir + '/import_fotod_results.csv'
const result_stream = fs.createWriteStream(result_csv_path)
const fotod_csv_path = path.parse(__filename).dir + '/test.csv'
// const fotod_csv_path = path.parse(__filename).dir + '/VR Kavalerid puhtand - fotod.csv'
const kavalerid_entu_type = {'type': '_type', 'string': 'vr_kavaler', 'reference': process.env.vr_kavaler_type_eid}

var counter = 0
const full_trshold = 15
const low_trshold = 14
var paused = false

const instream = fs.createReadStream(fotod_csv_path)
  .pipe(csv())
  .on('data', (csv_data) => {
    counter ++
    if (counter > full_trshold) {
      // console.log('Pressing breaks...')
      instream.pause()
      paused = true
    }
    // make sure photo file exists
    const file_path = path.parse(__filename).dir + '/in/png_links/' + csv_data.Failinimi
    const kavaler_eid = csv_data.Kavaler_eid
    const kavaler_id = csv_data.Kavaler_id
    if (!fs.existsSync(file_path)) {
      counter --
      const statusText = `File ${file_path} does not exist`
      console.log(statusText)
      result_stream.write(`${kavaler_eid} ${kavaler_id} ${statusText}\n`)
      return {status: 400, statusText}
    }
    const file_size = fs.statSync(file_path).size
    console.log(`Creating photo property for ${kavaler_id} with file: ${csv_data.Failinimi}`)
    // 1. request upload url
    fetch(
      `https://${entu_hostname}/${entu_account}/entity/${csv_data.Kavaler_eid}`, {
        method: 'POST',
        headers: {
          'Accept-Encoding': 'deflate',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify([{
          type: 'photo',
          filename: csv_data.Failinimi,
          filesize: file_size,
          filetype: 'image/png'
        }])
      }
    )
    .then(response => response.json())
    .then(json_data => {
      const upload_properties = json_data.properties[0].upload
      // console.log(`Upload headers: ${JSON.stringify(upload_properties.headers)}`)
      // add content length header
      // upload_properties.headers['Content-Length'] = file_size

      // 2. upload file
      fetch(upload_properties.url, {
        method: upload_properties.method,
        headers: upload_properties.headers,
        duplex: 'half',
        body: fs.createReadStream(file_path),
      })
      .then(async (response) => {
        // console.log(`Upload response: ${response.status}`)
        // console.log(`Upload response: ${response.statusText}`)
        // stall a bit to let the server process the upload
        return await response
      })
      .then(response => {
        counter--
        if (counter < low_trshold && paused) {
          // console.log('Resuming...')
          instream.resume()
          paused = false
        }
        // 4. Save results to 'import_fotod_results.csv'
        result_stream.write(`${kavaler_eid} ${kavaler_id} ${response.statusText}\n`)
        console.log(`Upload for: ${kavaler_eid} (${kavaler_id}) result: ${response.statusText}`)
      })
    })
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
  })


