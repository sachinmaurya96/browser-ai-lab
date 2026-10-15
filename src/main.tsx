import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './styles.css'
import { Shell } from './ui/Shell'
import { Home, NotFound } from './ui/Home'
import { TOOLS } from './tools'

const router = createHashRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Home /> },
      ...TOOLS.map((t) => ({ path: t.slug, element: <t.page /> })),
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
