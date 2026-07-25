INSERT INTO medical_conditions (name, category, sort_order) VALUES
  ('Addison''s Disease', 'DISEASE', 1),
  ('Nut Allergy', 'ALLERGY', 2),
  ('Soya Allergy', 'ALLERGY', 3),
  ('High Blood Pressure', 'CONDITION', 4),
  ('Liver Disease', 'DISEASE', 5),
  ('Kidney Disease', 'DISEASE', 6),
  ('Breast Lump', 'CONDITION', 7),
  ('I am pregnant or there is a risk I could get pregnant', 'CONDITION', 8),
  ('Heart Disease', 'DISEASE', 9)
ON CONFLICT DO NOTHING;
