import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import Aura from '@primeng/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';
import { HttpHeaderInterceptor } from './app/interceptors/http-header.interceptor';

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withInterceptors([HttpHeaderInterceptor])),
        provideAnimationsAsync(),
        providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.app-dark' } },
                     
            translation: {
                                monthNames: [
                                '1月', '2月', '3月', '4月', '5月', '6月',
                                '7月', '8月', '9月', '10月', '11月', '12月'
                                ],
                                monthNamesShort: [
                                '1月', '2月', '3月', '4月', '5月', '6月',
                                '7月', '8月', '9月', '10月', '11月', '12月'
                                ]
                            }
                        })
    ]
};
