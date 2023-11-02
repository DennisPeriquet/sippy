import { format, utcToZonedTime } from 'date-fns-tz'
import DateFnsUtils from '@date-io/date-fns'
export class GridToolbarFilterDateUtils extends DateFnsUtils {
  constructor() {
    super()
  }

  getHours(date) {
    return date.getUTCHours()
  }

  getMinutes(date) {
    return date.getUTCMinutes()
  }

  format(date, formatString) {
    console.log('date, formatString: ', date, formatString)
    // const t = `${format(utcToZonedTime(date, 'UTC'), formatString, {
    //   timeZone: 'Etc/UTC',
    //   locale: this.locale,
    // })}`
    const t = `${format(date, formatString, {
      timeZone: 'Etc/UTC',
      locale: this.locale,
    })}`
    console.log('t = ', t)
    return t
  }
}
