// Large parts of the app load on demand. Starting a download on hover or focus gives it a head start
// before the click.

// CesiumJS is large, so the 3D globe loads only when the Dashboard first shows it.
export const loadDashboardGlobe = () => import('../components/DashboardGlobe')
export const warmGlobe = () => void loadDashboardGlobe()

// The Preview tour and its animation library load only when Preview is first clicked.
export const loadPreviewTour = () => import('../components/PreviewTour')
export const warmPreviewTour = () => void loadPreviewTour()
