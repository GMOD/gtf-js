import gtf from '../dist'

let itemBuffer

process.stdout.write('[\n')
process.stdin
  .pipe(gtf.parseStream({ parseAll: true }))
  .on('data', item => {
    itemBuffer = JSON.stringify(item)
    if (itemBuffer) {
      process.stdout.write(itemBuffer)
      process.stdout.write(',\n')
    }
  })
  .on('error', err => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
  })
  .on('end', () => {
    if (itemBuffer) {
      process.stdout.write(itemBuffer)
    }
    process.stdout.write('\n]\n')
  })
