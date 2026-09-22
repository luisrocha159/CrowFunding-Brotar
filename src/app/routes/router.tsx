import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from '../../shared/layout/PublicLayout'
import { NotFoundPage } from './NotFoundPage'
import { HomePage } from '../../features/public/home/HomePage'
import { HowItWorksPage } from '../../features/public/how-it-works/HowItWorksPage'
import { ForCreatorsPage } from '../../features/public/for-creators/ForCreatorsPage'
import { ExploreProjectsPage } from '../../features/public/explore-projects/ExploreProjectsPage'
import { SearchProjectsPage } from '../../features/public/explore-projects/SearchProjectsPage'
import { ProjectDetailPage } from '../../features/public/project-detail/ProjectDetailPage'
import { LoginPage } from '../../features/access/login/LoginPage'
import { RegisterPage } from '../../features/access/register/RegisterPage'
import { RecoverPasswordPage } from '../../features/access/recover-password/RecoverPasswordPage'
import { AccountPage } from '../../features/access/session/AccountPage'
import { OrganizationsPage } from '../../features/organizations/OrganizationsPage'
import { CampaignBuilderPage } from '../../features/campaigns/CampaignBuilderPage'
import { CoverDraftPage } from '../../features/campaign-drafts/CoverDraftPage'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'como-funciona', element: <HowItWorksPage /> },
      { path: 'para-creadores', element: <ForCreatorsPage /> },
      { path: 'explorar', element: <ExploreProjectsPage /> },
      { path: 'explorar/buscar', element: <SearchProjectsPage /> },
      { path: 'proyectos/:slug', element: <ProjectDetailPage /> },
      { path: 'iniciar-sesion', element: <LoginPage /> },
      { path: 'mi-cuenta', element: <AccountPage /> },
      { path: 'mis-organizaciones', element: <OrganizationsPage /> },
      { path: 'crear-campana', element: <CampaignBuilderPage /> },
      { path: 'mi-campana/portada', element: <CoverDraftPage /> },
      { path: 'registro', element: <RegisterPage /> },
      { path: 'recuperar-contrasena', element: <RecoverPasswordPage /> },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
])
