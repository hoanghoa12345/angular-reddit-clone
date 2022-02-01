import {Injectable} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http'
import { AuthService } from './auth/shared/auth.service';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { LoginResponse } from './auth/login/login-response.payload';

@Injectable({
  providedIn: 'root'
})
export class TokenInterceptor implements HttpInterceptor {

  private isTokenRefreshing: boolean
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject(null);
  constructor(public authServive: AuthService){

  }

  intercept(req: HttpRequest<any>, next: HttpHandler):
  Observable<HttpEvent<any>> {

    const jwtToken = this.authServive.getJwtToken();
    if(jwtToken) {
      this.addToken(req, jwtToken);

    }

    return next.handle(req).pipe(catchError(error => {
      if(error instanceof HttpErrorResponse && error.status === 403){
        return this.handleAuthErrors(req, next);
      }else{
        return throwError(error);
      }
    }));

  }

  addToken(req: HttpRequest<any>, jwtToken: any) {
    return req.clone({
      headers: req.headers.set('Authorization','Bearer ' + jwtToken)
    })
  }

  private handleAuthErrors(req: HttpRequest<any>, next: HttpHandler)
  :Observable<HttpEvent<any>>{
    if(!this.isTokenRefreshing){
      this.isTokenRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authServive.refreshToken().pipe(
        switchMap((refreshTokenResponse: LoginResponse) => {
          this.isTokenRefreshing = false;
          this.refreshTokenSubject
          .next(refreshTokenResponse.authenticationToken);
          return next.handle(this.addToken(req,
            refreshTokenResponse.authenticationToken));
        })
      )
    }
  }


}