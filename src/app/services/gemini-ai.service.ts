import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class GeminiAiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Generates a professional e-commerce product description.
   * First calls the secure Backend API (/api/ai/generate-description) which uses
   * the GEMINI_API_KEY stored in the backend .env file.
   * Falls back gracefully if backend or API key is unreachable.
   */
  generateProductDescription(name: string, category: string = 'General', price?: number): Observable<string> {
    const productName = name?.trim() || 'Premium Enterprise Product';
    const catName = category?.trim() || 'Retail & Enterprise';

    const endpoint = `${this.apiUrl}/ai/generate-description`;
    const payload = {
      name: productName,
      category: catName,
      price: price
    };

    return this.http.post<any>(endpoint, payload).pipe(
      map(res => {
        if (res && res.description) {
          return res.description.trim();
        }
        return this.getFallbackDescription(productName, catName);
      }),
      catchError(() => {
        // If backend endpoint fails or is offline, use fallback description
        return of(this.getFallbackDescription(productName, catName));
      })
    );
  }

  private getFallbackDescription(name: string, category: string): string {
    const templates = [
      `Introducing the ${name} — meticulously crafted for high-performance ${category} operations. Designed with commercial-grade durability and modern ergonomics, this item delivers superior reliability across multi-location enterprises. Engineered to streamline inventory turnaround while maintaining exceptional presentation standards. Ideal for professional retail hubs looking to maximize customer satisfaction and ROI.`,
      `Elevate your catalog with the ${name}. Premium-grade construction paired with sleek, enterprise-ready aesthetics makes this essential for modern ${category} workflows. Features rigorous quality assurance testing, seamless operational integration, and lasting durability under demanding daily usage. Backed by industry-standard compliance and verified distributor excellence.`,
      `Discover next-level performance with the ${name}. Specifically tailored for businesses within the ${category} sector, it combines cutting-edge engineering with user-centric design. Offering outstanding efficiency, reduced maintenance overhead, and a polished contemporary finish that inspires buyer confidence at every scale.`
    ];

    const randomIndex = Math.floor(Math.random() * templates.length);
    return templates[randomIndex];
  }
}
