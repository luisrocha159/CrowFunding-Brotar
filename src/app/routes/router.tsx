import {OrganizationInvitationsPage} from '../../features/verifications/OrganizationInvitationsPage'
import {PublicAccountabilityPage} from '../../features/campaign-progress/PublicAccountabilityPage'
import {PublicationAdministrationPage} from '../../features/campaign-progress/PublicationAdministrationPage'
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
import {ConfirmEmailPage} from '../../features/access/session/ContactPanel'
import { OrganizationsPage } from '../../features/organizations/OrganizationsPage'
import { CampaignBuilderPage } from '../../features/campaigns/CampaignBuilderPage'
import { CoverDraftPage } from '../../features/campaign-drafts/CoverDraftPage'
import { ProjectsPage } from '../../features/campaigns/ProjectsPage'
import { CreatorAdministrationPage } from '../../features/organizations/CreatorAdministrationPage'
import { GuestAccessGate } from '../../features/access/session/GuestAccessGate'
import { FinancePage } from '../../features/finance/FinancePage'
import { AuditPage } from '../../features/audit/AuditPage'
import { ReconciliationPage } from '../../features/finance/ReconciliationPage'
import { BookmarksPage } from '../../features/bookmarks/BookmarksPage'

import { CatalogsPage } from '../../features/catalogs/CatalogsPage'
import { ContributionsPage, ContributionDetailPage, ContributionReceiptPage, SponsorDashboardPage } from '../../features/contributions/ContributionPages'
import { SimulationPage } from '../../features/contributions/SimulationPage'
import { DemoCheckoutPage } from '../../features/contributions/DemoCheckoutPage'
import { VerificationPage } from '../../features/verifications/VerificationPage'
import {VerificationReviewPage} from '../../features/verifications/VerificationReviewPage'
import {RefundPage,RefundRequestPage} from '../../features/refunds/RefundPages'
import {DisputesPage,DisputeRequestPage} from '../../features/disputes/DisputePages'
import { PartyAdministrationPage } from '../../features/verifications/PartyAdministrationPage'
import { ProgressPage } from '../../features/campaign-progress/ProgressPage'
import { CreatorDashboardPage } from '../../features/campaign-progress/CreatorDashboardPage'

import { AccountabilityPage } from '../../features/campaign-progress/AccountabilityPage'
import { AdministrativeDashboardPage } from '../../features/campaign-progress/AdministrativeDashboardPage'

import { SupportCasesPage } from '../../features/support-cases/SupportCasesPage'
import { SupportAdministrationPage } from '../../features/support-cases/SupportAdministrationPage'
import {CampaignCyclePage} from '../../features/campaign-lifecycle/CampaignCyclePage'
import {ClosurePage} from '../../features/campaign-lifecycle/ClosurePage'
import {DisbursementPage} from '../../features/disbursements/DisbursementPages'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {path:'mis-proyectos/:id/cierre',element:<ClosurePage/>},
      {path:'administracion/cierre-campanas',element:<ClosurePage administrative/>},
      {path:'administracion/cierre-campanas/:id',element:<ClosurePage administrative/>},
      {path:'mis-campanas/ciclo',element:<CampaignCyclePage/>},
      {path:'mis-campanas/ciclo/:id',element:<CampaignCyclePage/>},
      {path:'administracion/ciclo-campanas',element:<CampaignCyclePage administrative/>},
      {path:'administracion/ciclo-campanas/:id',element:<CampaignCyclePage administrative/>},
      {path:'mis-desembolsos',element:<DisbursementPage/>},
      {path:'mis-desembolsos/:id',element:<DisbursementPage/>},
      {path:'mis-proyectos/:campaignId/desembolsos',element:<DisbursementPage/>},
      {path:'administracion/desembolsos',element:<DisbursementPage administrative/>},
      {path:'administracion/desembolsos/:id',element:<DisbursementPage administrative/>},
      { index: true, element: <HomePage /> },
      { path: 'como-funciona', element: <HowItWorksPage /> },
      { path: 'para-creadores', element: <ForCreatorsPage /> },
      { path: 'explorar', element: <ExploreProjectsPage /> },
      { path: 'explorar/buscar', element: <SearchProjectsPage /> },
      {path:'campanas/:id/rendicion-publica',element:<PublicAccountabilityPage/>},
      { path: 'proyectos/:slug', element: <ProjectDetailPage /> },
      { path: 'iniciar-sesion', element: <GuestAccessGate><LoginPage /></GuestAccessGate> },
      { path: 'mi-cuenta', element: <AccountPage /> },
      { path: 'verificar-correo', element: <ConfirmEmailPage /> },
      { path: 'mis-incidencias', element: <SupportCasesPage /> },
      { path: 'mis-incidencias/nueva', element: <SupportCasesPage create /> },
      { path: 'mis-incidencias/:id', element: <SupportCasesPage /> },
      { path: 'administracion/soporte', element: <SupportAdministrationPage /> },
      { path: 'administracion/soporte/:id', element: <SupportAdministrationPage /> },
      { path: 'mis-aportes', element: <ContributionsPage /> },
      { path: 'mis-aportes/:id', element: <ContributionDetailPage /> },
      { path: 'mis-aportes/:id/comprobante', element: <ContributionReceiptPage /> },
      { path: 'panel-patrocinador', element: <SponsorDashboardPage /> },
      { path: 'simulacion-apoyo', element: <SimulationPage /> },
      { path: 'apoyo-demo', element: <DemoCheckoutPage /> },
      { path: 'mi-verificacion', element: <VerificationPage /> },
      { path:'administracion/verificaciones',element:<VerificationReviewPage/> },
      { path:'administracion/verificaciones/:id',element:<VerificationReviewPage/> },
      {path:'mis-devoluciones',element:<RefundPage/>},
      {path:'mis-devoluciones/nueva',element:<RefundRequestPage/>},
      {path:'mis-devoluciones/:id',element:<RefundPage/>},
      {path:'administracion/devoluciones',element:<RefundPage administrative/>},
      {path:'administracion/devoluciones/:id',element:<RefundPage administrative/>},
      {path:'mis-disputas',element:<DisputesPage/>},
      {path:'mis-disputas/nueva',element:<DisputeRequestPage/>},
      {path:'mis-disputas/:id',element:<DisputesPage/>},
      {path:'administracion/disputas',element:<DisputesPage administrative/>},
      {path:'administracion/disputas/:id',element:<DisputesPage administrative/>},
      { path: 'panel-creador', element: <CreatorDashboardPage /> },
      { path: 'mis-proyectos/:id/rendicion', element: <AccountabilityPage /> },
      { path: 'administracion/rendicion', element: <AccountabilityPage administrative /> },
      { path: 'administracion/rendicion/:id', element: <AccountabilityPage administrative /> },
      {path:'administracion/publicaciones',element:<PublicationAdministrationPage/>},
      { path: 'administracion', element: <AdministrativeDashboardPage /> },
      { path: 'mis-proyectos/:id/avances', element: <ProgressPage /> },
      { path: 'administracion/catalogos', element: <CatalogsPage /> },
      { path: 'administracion/personas', element: <PartyAdministrationPage /> },
      { path: 'mis-guardados', element: <BookmarksPage /> },
      { path: 'mis-organizaciones', element: <OrganizationsPage /> },
      { path: 'crear-campana', element: <CampaignBuilderPage /> },
      {path:'mis-invitaciones',element:<OrganizationInvitationsPage/>},
      { path: 'mis-proyectos', element: <ProjectsPage /> },
      { path: 'mis-proyectos/:id', element: <ProjectsPage /> },
      { path: 'administracion/campanas', element: <ProjectsPage admin /> },
      { path: 'administracion/campanas/:id', element: <ProjectsPage admin /> },
      { path: 'administracion/usuarios', element: <CreatorAdministrationPage /> },
      { path: 'administracion/finanzas', element: <FinancePage /> },
      { path: 'administracion/conciliacion', element: <ReconciliationPage /> },
      { path: 'administracion/conciliacion/:id', element: <ReconciliationPage /> },
      { path: 'administracion/auditoria', element: <AuditPage /> },
      { path: 'mi-campana/portada', element: <CoverDraftPage /> },
      { path: 'registro', element: <GuestAccessGate><RegisterPage /></GuestAccessGate> },
      { path: 'recuperar-contrasena', element: <RecoverPasswordPage /> },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
])
