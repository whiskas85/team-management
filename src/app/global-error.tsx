'use client';

/**
 * L'ultima rete: qui si finisce solo se a rompersi è stata la struttura stessa
 * della pagina, quindi non c'è nulla dell'applicazione su cui appoggiarsi —
 * niente stili, niente menu. Serve a non lasciare una pagina bianca.
 */
export default function ErroreGlobale({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="it">
      <body
        style={{
          background: '#0a0c0a',
          color: '#d7dbd7',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', letterSpacing: '0.3em', color: '#7bd88f' }}>ZERO DARK OPS</p>
          <h1 style={{ fontSize: '1.25rem', marginTop: '1rem' }}>Il gestionale non risponde</h1>
          <p style={{ fontSize: '0.875rem', color: '#8b918b', marginTop: '0.75rem' }}>
            Ricarica la pagina. Se il problema resta, il server potrebbe essere spento o in
            aggiornamento.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.6875rem', color: '#8b918b', marginTop: '0.5rem' }}>
              riferimento {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => location.reload()}
            style={{
              marginTop: '1.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #7bd88f',
              background: 'transparent',
              color: '#7bd88f',
              cursor: 'pointer',
            }}
          >
            Ricarica
          </button>
        </div>
      </body>
    </html>
  );
}
