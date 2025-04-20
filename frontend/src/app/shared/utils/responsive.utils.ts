import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveUtils {
  // Observable for handset (mobile) mode
  isHandset$: Observable<boolean>;

  // Observable for tablet mode
  isTablet$: Observable<boolean>;

  // Observable for desktop mode
  isDesktop$: Observable<boolean>;

  // Observable for orientation
  isPortrait$: Observable<boolean>;

  constructor(private breakpointObserver: BreakpointObserver) {
    // Initialize observables in constructor
    this.isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
      .pipe(
        map(result => result.matches),
        shareReplay(1)
      );

    this.isTablet$ = this.breakpointObserver.observe([Breakpoints.TabletPortrait, Breakpoints.TabletLandscape])
      .pipe(
        map(result => result.matches),
        shareReplay(1)
      );

    this.isDesktop$ = this.breakpointObserver.observe([Breakpoints.Web, Breakpoints.WebLandscape, Breakpoints.WebPortrait])
      .pipe(
        map(result => result.matches),
        shareReplay(1)
      );

    this.isPortrait$ = this.breakpointObserver.observe([Breakpoints.HandsetPortrait, Breakpoints.TabletPortrait, Breakpoints.WebPortrait])
      .pipe(
        map(result => result.matches),
        shareReplay(1)
      );
  }

  /**
   * Get current device type
   * @returns Observable that emits 'mobile', 'tablet', or 'desktop'
   */
  getDeviceType(): Observable<'mobile' | 'tablet' | 'desktop'> {
    return this.breakpointObserver.observe([
      Breakpoints.Handset,
      Breakpoints.TabletPortrait,
      Breakpoints.TabletLandscape,
      Breakpoints.Web
    ]).pipe(
      map(result => {
        if (result.breakpoints[Breakpoints.Handset]) {
          return 'mobile';
        }
        if (result.breakpoints[Breakpoints.TabletPortrait] || result.breakpoints[Breakpoints.TabletLandscape]) {
          return 'tablet';
        }
        return 'desktop';
      }),
      shareReplay()
    );
  }
}
