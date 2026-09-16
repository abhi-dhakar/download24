import { redirect } from 'next/navigation'

/**
 * `/downloader` — dedicated nav target that redirects to the homepage.
 *
 * The homepage *is* the downloader (step 1 of the three-page flow), so this
 * route exists only to keep the nav item honest: "Downloader" always lands you
 * on the paste-a-link box at the top of `/`.
 */
export default function DownloaderPage() {
  redirect('/')
}
