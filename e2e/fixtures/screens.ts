import type { Page } from '@playwright/test';
import { AdminVerificationPage } from '../pages/admin-verification.page';
import { AdminVerificationsPage } from '../pages/admin-verifications.page';
import { BrowsePage } from '../pages/browse.page';
import { BusinessLoadingScreen, BusinessPage } from '../pages/business.page';
import { CategoryFiltersScreen, CategoryPage } from '../pages/category.page';
import { ForbiddenPage } from '../pages/forbidden.page';
import { NotFoundPage } from '../pages/not-found.page';
import {
  ProductInvalidScreen,
  ProductLoadingScreen,
  ProductPage,
  ProductWithSizeScreen,
} from '../pages/product.page';
import { EditListingPage } from '../pages/edit-listing.page';
import { IncomingRequestsPage } from '../pages/incoming-requests.page';
import { SavedPage } from '../pages/saved.page';
import { ForgotPasswordPage } from '../pages/forgot-password.page';
import { ResetPasswordPage } from '../pages/reset-password.page';
import { NotificationsPage } from '../pages/notifications.page';
import { MyProductsPage } from '../pages/my-products.page';
import { MyServicesPage } from '../pages/my-services.page';
import { MyBusinessPage } from '../pages/my-business.page';
import { RequestDetailPage } from '../pages/request-detail.page';
import { RequestsPage } from '../pages/requests.page';
import { JoinPage } from '../pages/join.page';
import { ConversationPage, MessagesPage } from '../pages/messages.page';
import { SearchPage } from '../pages/search.page';
import { VerifyEmailPage } from '../pages/verify-email.page';
import { WelcomePage } from '../pages/welcome.page';
import type { RouteKey } from './routes';
import type { Screen } from './visual';

/** Every screen state of the journey with the page object that knows its parts. */
export const screens: {
  key: RouteKey;
  screen: (page: Page) => Screen;
  /** The widths at which the screen exists, when it is not all of them. */
  below?: number;
}[] = [
  { key: 'welcome', screen: (page) => new WelcomePage(page) },
  { key: 'requests', screen: (page) => new RequestsPage(page) },
  { key: 'requests.empty', screen: (page) => new RequestsPage(page) },
  { key: 'requests.error', screen: (page) => new RequestsPage(page) },
  { key: 'request-detail', screen: (page) => new RequestDetailPage(page) },
  { key: 'request-detail.confirmed', screen: (page) => new RequestDetailPage(page) },
  { key: 'request-detail.declined', screen: (page) => new RequestDetailPage(page) },
  { key: 'request-detail.cancelled', screen: (page) => new RequestDetailPage(page) },
  { key: 'request-detail.error', screen: (page) => new RequestDetailPage(page) },
  { key: 'incoming-requests', screen: (page) => new IncomingRequestsPage(page) },
  { key: 'incoming-requests.empty', screen: (page) => new IncomingRequestsPage(page) },
  { key: 'incoming-requests.error', screen: (page) => new IncomingRequestsPage(page) },
  { key: 'my-business', screen: (page) => new MyBusinessPage(page) },
  { key: 'my-business.pending', screen: (page) => new MyBusinessPage(page) },
  { key: 'my-business.changes-requested', screen: (page) => new MyBusinessPage(page) },
  { key: 'my-business.empty', screen: (page) => new MyBusinessPage(page) },
  { key: 'my-business.error', screen: (page) => new MyBusinessPage(page) },
  { key: 'my-business.paused', screen: (page) => new MyBusinessPage(page) },
  { key: 'saved', screen: (page) => new SavedPage(page) },
  { key: 'saved.empty', screen: (page) => new SavedPage(page) },
  { key: 'saved.error', screen: (page) => new SavedPage(page) },
  { key: 'forgot-password', screen: (page) => new ForgotPasswordPage(page) },
  { key: 'reset-password', screen: (page) => new ResetPasswordPage(page) },
  { key: 'reset-password.expired', screen: (page) => new ResetPasswordPage(page) },
  { key: 'reset-password.error', screen: (page) => new ResetPasswordPage(page) },
  { key: 'notifications', screen: (page) => new NotificationsPage(page) },
  { key: 'notifications.read', screen: (page) => new NotificationsPage(page) },
  { key: 'notifications.empty', screen: (page) => new NotificationsPage(page) },
  { key: 'notifications.error', screen: (page) => new NotificationsPage(page) },
  { key: 'my-products', screen: (page) => new MyProductsPage(page) },
  { key: 'my-products.empty', screen: (page) => new MyProductsPage(page) },
  { key: 'my-products.error', screen: (page) => new MyProductsPage(page) },
  { key: 'my-services', screen: (page) => new MyServicesPage(page) },
  { key: 'my-services.empty', screen: (page) => new MyServicesPage(page) },
  { key: 'my-services.error', screen: (page) => new MyServicesPage(page) },
  { key: 'edit-listing', screen: (page) => new EditListingPage(page) },
  { key: 'edit-listing.error', screen: (page) => new EditListingPage(page) },
  { key: 'admin-verifications', screen: (page) => new AdminVerificationsPage(page) },
  { key: 'admin-verifications.empty', screen: (page) => new AdminVerificationsPage(page) },
  { key: 'admin-verifications.error', screen: (page) => new AdminVerificationsPage(page) },
  { key: 'admin-verification', screen: (page) => new AdminVerificationPage(page) },
  { key: 'admin-verification.approved', screen: (page) => new AdminVerificationPage(page) },
  {
    key: 'admin-verification.changes-requested',
    screen: (page) => new AdminVerificationPage(page),
  },
  { key: 'admin-verification.error', screen: (page) => new AdminVerificationPage(page) },
  { key: 'forbidden', screen: (page) => new ForbiddenPage(page) },
  { key: 'browse', screen: (page) => new BrowsePage(page) },
  { key: 'browse.signed-out', screen: (page) => new BrowsePage(page) },
  { key: 'browse.loading', screen: (page) => new BrowsePage(page) },
  { key: 'browse.empty', screen: (page) => new BrowsePage(page) },
  { key: 'browse.error', screen: (page) => new BrowsePage(page) },
  { key: 'browse.edge', screen: (page) => new BrowsePage(page) },
  { key: 'category', screen: (page) => new CategoryPage(page) },
  { key: 'category.loading', screen: (page) => new CategoryPage(page) },
  { key: 'category.empty', screen: (page) => new CategoryPage(page) },
  { key: 'category.error', screen: (page) => new CategoryPage(page) },
  { key: 'category.no-results', screen: (page) => new CategoryPage(page) },
  { key: 'category.long', screen: (page) => new CategoryPage(page) },
  // The filters sheet is the under-768 px form of the filters.
  { key: 'filters', screen: (page) => new CategoryFiltersScreen(page), below: 768 },
  { key: 'business', screen: (page) => new BusinessPage(page) },
  { key: 'business.loading', screen: (page) => new BusinessLoadingScreen(page) },
  { key: 'business.error', screen: (page) => new BusinessPage(page) },
  { key: 'business.empty', screen: (page) => new BusinessPage(page) },
  { key: 'business.edge', screen: (page) => new BusinessPage(page) },
  { key: 'business.owner', screen: (page) => new BusinessPage(page) },
  { key: 'shop', screen: (page) => new BusinessPage(page) },
  { key: 'shop.loading', screen: (page) => new BusinessLoadingScreen(page) },
  { key: 'shop.error', screen: (page) => new BusinessPage(page) },
  { key: 'shop.empty', screen: (page) => new BusinessPage(page) },
  { key: 'product', screen: (page) => new ProductWithSizeScreen(page) },
  { key: 'product.invalid', screen: (page) => new ProductInvalidScreen(page) },
  { key: 'product.loading', screen: (page) => new ProductLoadingScreen(page) },
  { key: 'product.error', screen: (page) => new ProductPage(page) },
  { key: 'product.sold-out', screen: (page) => new ProductPage(page) },
  { key: 'product.alert-requested', screen: (page) => new ProductPage(page) },
  { key: 'messages', screen: (page) => new MessagesPage(page) },
  { key: 'messages.empty', screen: (page) => new MessagesPage(page) },
  { key: 'messages.loading', screen: (page) => new MessagesPage(page) },
  { key: 'messages.error', screen: (page) => new MessagesPage(page) },
  { key: 'conversation', screen: (page) => new ConversationPage(page) },
  { key: 'conversation.loading', screen: (page) => new ConversationPage(page) },
  { key: 'conversation.error', screen: (page) => new ConversationPage(page) },
  { key: 'search', screen: (page) => new SearchPage(page) },
  { key: 'search.loading', screen: (page) => new SearchPage(page) },
  { key: 'search.empty', screen: (page) => new SearchPage(page) },
  { key: 'search.error', screen: (page) => new SearchPage(page) },
  { key: 'search.no-results', screen: (page) => new SearchPage(page) },
  { key: 'sign-up', screen: (page) => new JoinPage(page) },
  { key: 'join-agreement', screen: (page) => new JoinPage(page) },
  { key: 'verify-email', screen: (page) => new VerifyEmailPage(page) },
  { key: 'verify-email.loading', screen: (page) => new VerifyEmailPage(page) },
  { key: 'verify-email.success', screen: (page) => new VerifyEmailPage(page) },
  { key: 'verify-email.expired', screen: (page) => new VerifyEmailPage(page) },
  { key: 'verify-email.error', screen: (page) => new VerifyEmailPage(page) },
  { key: 'verify-email-banner', screen: (page) => new BrowsePage(page) },
  { key: 'verify-email-banner.danger', screen: (page) => new BrowsePage(page) },
  { key: 'not-found', screen: (page) => new NotFoundPage(page) },
];
