import createInit$ from './init'
import createTimelapse$ from './timelapse'
import { errorHandler } from './utils'

const init$ = createInit$()
init$.subscribe(
  (config) => {
    const timelapse$ = createTimelapse$(config)

    timelapse$.subscribe(
      (shoot) => console.log(`Finished shooting and processing of image #${shoot.nr}`),
      errorHandler,
      () => {
        console.log('Finished timelapse')
      }
    )
  },
  errorHandler
)
