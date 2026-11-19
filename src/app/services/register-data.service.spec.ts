import { clearDniDependentData } from './register-data.service';

describe('clearDniDependentData', () => {
  it('clears person and lookup data when the DNI changes, preserving unrelated form data', () => {
    const updated = clearDniDependentData({
      DNI: '12345678',
      NOMBRES: 'ANA',
      APELLIDO_PATERNO: 'PÉREZ',
      APELLIDO_MATERNO: 'GARCÍA',
      FECHA_NACIMIENTO: '1985-06-15',
      SEXO: 'FEMENINO',
      ACTIVIDAD_AGRARIA: 'CAFÉ',
      CELULAR_PARTICIPANTE: '987654321'
    }, '87654321');

    expect(updated).toEqual(jasmine.objectContaining({
      DNI: '87654321',
      NOMBRES: '',
      APELLIDO_PATERNO: '',
      APELLIDO_MATERNO: '',
      FECHA_NACIMIENTO: '',
      SEXO: '',
      ACTIVIDAD_AGRARIA: '',
      SUPERFICIE_MIDAGRI: null,
      CELULAR_PARTICIPANTE: '987654321'
    }));
  });
});
