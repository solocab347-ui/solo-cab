/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Réinitialisation de votre mot de passe — SoloCab</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoSection}>
          <img src="https://solo-cab-to-lovable.lovable.app/logo-solocab.png" width="60" height="60" alt="SoloCab" style={logoImg} />
        </div>
        <Heading style={h1}>Réinitialiser votre mot de passe</Heading>
        <Text style={text}>
          Vous avez demandé à réinitialiser votre mot de passe SoloCab. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
        </Text>
        <div style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            🔑 Réinitialiser mon mot de passe
          </Button>
        </div>
        <Text style={footer}>
          Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        </Text>
        <Text style={brand}>SoloCab — L'outil des chauffeurs VTC indépendants</Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '30px 25px', maxWidth: '480px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoImg = { margin: '0 auto', borderRadius: '12px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a2e', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#4a4a5a', lineHeight: '1.6', margin: '0 0 24px', textAlign: 'center' as const }
const buttonSection = { textAlign: 'center' as const, margin: '0 0 24px' }
const button = { backgroundColor: '#4183f0', color: '#ffffff', fontSize: '16px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 32px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 8px', textAlign: 'center' as const }
const brand = { fontSize: '11px', color: '#bbbbcc', textAlign: 'center' as const, margin: '0' }
