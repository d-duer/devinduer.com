import { useMediaQuery } from 'usehooks-ts'

export function IsMobile():boolean {
    const isMobile = useMediaQuery('(max-width: 1500px)')
    return isMobile
  }

export default IsMobile;