-- Ajouter le statut 'on_hold' à l'enum driver_status pour les demandes mises en attente
ALTER TYPE driver_status ADD VALUE IF NOT EXISTS 'on_hold';