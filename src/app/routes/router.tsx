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
import { ProjectsPage } from '../../features/campaigns/ProjectsPage'
import { CreatorAdministrationPage } from '../../features/organizations/CreatorAdministrationPage'
import { GuestAccessGate } from '../../features/access/session/GuestAccessGate'
import { BookmarksPage } from '../../features/bookmarks/BookmarksPage'

import { CatalogsPage } from '../../features/catalogs/CatalogsPage'
import { ContributionsPage, ContributionDetailPage, ContributionReceiptPage, SponsorDashboardPage } from '../../features/contributions/ContributionPages'
import { SimulationPage } from '../../features/contributions/SimulationPage'
import { VerificationPage } from '../../features/verifications/VerificationPage'
import { PartyAdministrationPage } from '../../features/verifications/PartyAdministrationPage'
import { ProgressPage } from '../../features/campaign-progress/ProgressPage'
import { CreatorDashboardPage } from '../../features/campaign-progress/CreatorDashboardPage'

import { AccountabilityPage } from '../../features/campaign-progress/AccountabilityPage'
import { AdministrativeDashboardPage } from '../../features/campaign-progress/AdministrativeDashboardPage'

import { SupportCasesPage } from '../../features/support-cases/SupportCasesPage'

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
      { path: 'iniciar-sesion', element: <GuestAccessGate><LoginPage /></GuestAccessGate> },
      { path: 'mi-cuenta', element: <AccountPage /> },
      { path: 'mis-incidencias', element: <SupportCasesPage /> },
      { path: 'mis-incidencias/nueva', element: <SupportCasesPage create /> },
      { path: 'mis-incidencias/:id', element: <SupportCasesPage /> },
      { path: 'mis-aportes', element: <ContributionsPage /> },
      { path: 'mis-aportes/:id', element: <ContributionDetailPage /> },
      { path: 'mis-aportes/:id/comprobante', element: <ContributionReceiptPage /> },
      { path: 'panel-patrocinador', element: <SponsorDashboardPage /> },
      { path: 'simulacion-apoyo', element: <SimulationPage /> },
      { path: 'mi-verificacion', element: <VerificationPage /> },
      { path: 'panel-creador', element: <CreatorDashboardPage /> },
      { path: 'mis-proyectos/:id/rendicion', element: <AccountabilityPage /> },
      { path: 'administracion', element: <AdministrativeDashboardPage /> },
      { path: 'mis-proyectos/:id/avances', element: <ProgressPage /> },
      { path: 'administracion/catalogos', element: <CatalogsPage /> },
      { path: 'administracion/personas', element: <PartyAdministrationPage /> },
      { path: 'mis-guardados', element: <BookmarksPage /> },
      { path: 'mis-organizaciones', element: <OrganizationsPage /> },
      { path: 'crear-campana', element: <CampaignBuilderPage /> },
      { path: 'mis-proyectos', element: <ProjectsPage /> },
      { path: 'mis-proyectos/:id', element: <ProjectsPage /> },
      { path: 'administracion/campanas', element: <ProjectsPage admin /> },
      { path: 'administracion/campanas/:id', element: <ProjectsPage admin /> },
      { path: 'administracion/usuarios', element: <CreatorAdministrationPage /> },
      { path: 'mi-campana/portada', element: <CoverDraftPage /> },
      { path: 'registro', element: <GuestAccessGate><RegisterPage /></GuestAccessGate> },
      { path: 'recuperar-contrasena', element: <RecoverPasswordPage /> },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
])
