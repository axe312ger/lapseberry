import { resolve } from 'path'

import Rx from 'rxjs'
import execa from 'execa'

const DELAY = 10 * 1000
const COUNT = 3
const DESTINATION = __dirname

function shootPhoto (shot) {
  console.log(`Shooting image #${shot.nr}`)
  const gshot2 = execa('gshot2', ['--capture-image-and-download', '--force-overwrite', '--filename', shot.rawFile])
  return Rx.Observable.fromPromise(gshot2)
    .mergeMap(() => Observable.from(shot))
}

function convertPhoto (shot) {
  console.log(`Converting #${shot.nr}`)
  const convert = execa('convert', ['-resize', '4096', shot.rawFile, shot.jpgFile])
  return Rx.Observable.fromPromise(convert)
    .mergeMap(() => Observable.from(shot))
}

const timelapse$ = Rx.Observable
  .timer(0, DELAY)
  .take(COUNT)
  .do(console.log)
  .map((x) => {
    console.log({x})
    const nr = x + 1
    const rawFile = resolve(DESTINATION, `timelapse-${nr}.arw`)
    const jpgFile = resolve(DESTINATION, `timelapse-${nr}.jpg`)
    return {
      nr,
      jpgFile,
      rawFile
    }
  })
  //.mergeMap(shootPhoto)
  //.mergeMap(convertPhoto)

timelapse$.subscribe(
  (shoot) => console.log(`Finished image #${shoot.nr}`),
  (err) => {
    console.log('An error occurred:')
    console.error(err)
  },
  () => {
    console.log('Finished')
  }
)