import reforestationImage from '../../shared/assets/proyecto-reforestacion.png'
import type { Project } from '../../shared/types/project'

// A fixed presentation snapshot: demonstrations do not expire as the clock changes.
export const DEMO_REFERENCE_DATE = '2026-09-09'
export const DEMO_NOTICE = 'Datos de demostración: campañas, organizaciones, montos y verificaciones ficticios. No se reciben aportes reales.'

const illustrativeImage = {
  image: reforestationImage,
  imageAlt: 'Personas plantando árboles en una jornada de reforestación',
  imageCaption: 'Fotografía ilustrativa de la referencia de Brotar; no documenta esta campaña ficticia.',
  isDemo: true as const
}

export const projects: readonly Project[] = [
  {
    ...illustrativeImage,
    id: 'demo-001', slug: 'reforestacion-chiquitana', name: 'Reforestación Chiquitana',
    summary: 'Recuperamos bosque nativo junto a comunidades de la Chiquitanía.',
    category: 'Medio ambiente', location: 'Santa Cruz', creator: 'Raíces Vivas',
    creatorDescription: 'Organización ficticia dedicada a la restauración de ecosistemas y la educación ambiental.',
    goal: 85000, raised: 61200, campaignType: 'donation', status: 'active', verified: true,
    featured: true, publishedAt: '2026-08-01', endsAt: '2026-09-27', daysRemaining: 18,
    description: 'La campaña propone recuperar áreas de bosque degradado mediante viveros comunitarios y jornadas de plantación con especies nativas. El acompañamiento local continuará después de la siembra.',
    problem: 'La pérdida de cobertura vegetal afecta el suelo y los espacios de vida de las comunidades.',
    solution: 'Preparar plantines, capacitar brigadas y dar seguimiento a las áreas restauradas.',
    beneficiaries: '80 familias de comunidades participantes en este ejemplo.',
    impact: [{ indicator: 'Árboles nativos por plantar', target: '5.000' }, { indicator: 'Superficie por restaurar', target: '20 hectáreas' }],
    trustSignals: ['Identidad del creador revisada (simulación)', 'Plan de actividades disponible en la descripción'],
    updates: [{ id: 'demo-001-u1', date: '2026-09-05', title: 'Preparación del vivero', content: 'Actualización ficticia: el equipo organizó los espacios para producir los primeros plantines.' }]
  },
  {
    ...illustrativeImage,
    id: 'demo-002', slug: 'huertos-comunitarios-cochabamba', name: 'Huertos comunitarios de Cochabamba',
    summary: 'Impulsamos huertos barriales y talleres de alimentación sostenible.',
    category: 'Producción sostenible', location: 'Cochabamba', creator: 'Semilla Compartida',
    creatorDescription: 'Colectivo ficticio de agricultura urbana que reúne a familias y facilitadores locales.',
    goal: 40000, raised: 16000, campaignType: 'reward', status: 'active', verified: true,
    featured: true, publishedAt: '2026-08-15', endsAt: '2026-10-09', daysRemaining: 30,
    description: 'Se habilitarán huertos demostrativos y talleres de compostaje. La modalidad de recompensa representa el reconocimiento al apoyo; sus condiciones definitivas no se implementan en esta etapa.',
    problem: 'Los barrios del ejemplo cuentan con pocos espacios para aprender a cultivar alimentos.',
    solution: 'Equipar parcelas compartidas y acompañar su mantenimiento mediante talleres.',
    beneficiaries: '60 familias y 12 facilitadores comunitarios del caso simulado.',
    impact: [{ indicator: 'Huertos por habilitar', target: '4' }, { indicator: 'Talleres previstos', target: '12' }],
    trustSignals: ['Perfil organizacional revisado (simulación)', 'Objetivos de impacto publicados'],
    updates: []
  },
  {
    ...illustrativeImage,
    id: 'demo-003', slug: 'textiles-circulares-la-paz', name: 'Textiles circulares de La Paz',
    summary: 'Una primera colección de bolsos reutilizables elaborados con retazos textiles.',
    category: 'Economía circular', location: 'La Paz', creator: 'Tejido Circular',
    creatorDescription: 'Taller asociativo ficticio que desarrolla productos reutilizables con materiales recuperados.',
    goal: 30000, raised: 31500, campaignType: 'presale', status: 'active', verified: true,
    featured: true, publishedAt: '2026-08-20', endsAt: '2026-09-21', daysRemaining: 12,
    description: 'La preventa simulada permite mostrar una iniciativa productiva que busca financiar su primera colección. No se aceptan pedidos ni se prometen entregas reales en este prototipo.',
    problem: 'Los excedentes textiles aprovechables suelen desecharse y los pequeños talleres requieren materiales y equipamiento.',
    solution: 'Recuperar retazos, preparar diseños y producir un lote inicial de bolsos reutilizables.',
    beneficiaries: '15 integrantes del taller ficticio y la comunidad de consumidores responsables.',
    impact: [{ indicator: 'Material por recuperar', target: '200 kg de textiles' }, { indicator: 'Lote inicial previsto', target: '300 bolsos' }],
    trustSignals: ['Identidad del creador revisada (simulación)', 'Proceso productivo descrito públicamente'],
    updates: [{ id: 'demo-003-u1', date: '2026-09-07', title: 'Prototipos de la colección', content: 'Actualización ficticia: se completó la revisión de los diseños iniciales.' }]
  },
  {
    ...illustrativeImage,
    id: 'demo-004', slug: 'biblioteca-comunitaria-potosi', name: 'Biblioteca comunitaria de Potosí',
    summary: 'Creamos un espacio de lectura y acompañamiento escolar para el barrio.',
    category: 'Educación', location: 'Potosí', creator: 'Lecturas Abiertas',
    creatorDescription: 'Agrupación ficticia de voluntariado para la lectura y el aprendizaje comunitario.',
    goal: 25000, raised: 0, campaignType: 'donation', status: 'active', verified: false,
    featured: false, publishedAt: '2026-09-09', endsAt: '2026-10-24', daysRemaining: 45,
    description: 'La propuesta busca equipar una sala de lectura con libros, mesas y actividades de acompañamiento escolar. Este ejemplo permite probar una campaña nueva que aún no recibió aportes.',
    problem: 'Los estudiantes del barrio simulado no disponen de un espacio cercano de consulta y lectura.',
    solution: 'Organizar una colección inicial, acondicionar el espacio y formar un equipo de voluntariado.',
    beneficiaries: '100 estudiantes y sus familias en el escenario de demostración.',
    impact: [{ indicator: 'Libros de la colección inicial', target: '600' }, { indicator: 'Sesiones de lectura previstas', target: '24' }],
    trustSignals: ['Descripción y metas públicas', 'Sin insignia de verificación en este ejemplo'],
    updates: []
  },
  {
    ...illustrativeImage,
    id: 'demo-005', slug: 'agua-segura-tarija', name: 'Agua segura para comunidades de Tarija',
    summary: 'Una iniciativa comunitaria de captación y uso responsable del agua.',
    category: 'Desarrollo comunitario', location: 'Tarija', creator: 'Agua Compartida',
    creatorDescription: 'Asociación ficticia enfocada en soluciones comunitarias de abastecimiento de agua.',
    goal: 60000, raised: 48000, campaignType: 'reward', status: 'finished', verified: true,
    featured: false, publishedAt: '2026-07-01', endsAt: '2026-08-31', daysRemaining: 0,
    statusReason: 'El periodo de recaudación de este ejemplo terminó. No admite nuevos aportes; no se simulan desembolsos ni devoluciones.',
    description: 'La campaña propuso mejorar la captación de agua y capacitar a las familias en su mantenimiento. La recaudación finalizó sin alcanzar la meta; no se infiere ninguna regla financiera de ese resultado.',
    problem: 'La disponibilidad estacional de agua dificulta las actividades diarias de las familias.',
    solution: 'Preparar sistemas de captación y acompañar su uso con formación comunitaria.',
    beneficiaries: '40 familias del escenario ficticio.',
    impact: [{ indicator: 'Sistemas propuestos', target: '2' }, { indicator: 'Personas por capacitar', target: '80' }],
    trustSignals: ['Identidad del creador revisada (simulación)', 'Estado de recaudación publicado'],
    updates: [{ id: 'demo-005-u1', date: '2026-09-01', title: 'Cierre de la recaudación', content: 'Actualización ficticia: terminó el periodo de aportes. Los resultados de ejecución todavía no están publicados.' }]
  },
  {
    ...illustrativeImage,
    id: 'demo-006', slug: 'cacao-agroforestal-beni', name: 'Cacao agroforestal del Beni',
    summary: 'Producción de cacao vinculada al cuidado del bosque y al trabajo local.',
    category: 'Producción sostenible', location: 'Beni', creator: 'Bosque y Cacao',
    creatorDescription: 'Cooperativa ficticia que combina prácticas agroforestales y transformación de cacao.',
    goal: 50000, raised: 7500, campaignType: 'presale', status: 'cancelled', verified: false,
    featured: false, publishedAt: '2026-08-01', endsAt: '2026-09-08', daysRemaining: 0,
    statusReason: 'Campaña cancelada en el escenario de prueba por cambios en el plan de producción. No se aceptan aportes ni pedidos.',
    description: 'La iniciativa buscaba presentar una primera producción de cacao bajo un modelo de preventa. Se conserva su información pública para demostrar el estado cancelado sin activar operaciones comerciales.',
    problem: 'Los productores del ejemplo requieren fortalecer el procesamiento local y su acceso a mercados.',
    solution: 'La propuesta original contemplaba equipamiento básico y preparación de un lote inicial de cacao.',
    beneficiaries: '20 familias productoras contempladas en la propuesta original ficticia.',
    impact: [{ indicator: 'Meta original de formación', target: '20 productores' }, { indicator: 'Lote inicial propuesto', target: '400 unidades' }],
    trustSignals: ['Motivo de cancelación publicado', 'Sin insignia de verificación en este ejemplo'],
    updates: [{ id: 'demo-006-u1', date: '2026-09-08', title: 'Campaña cancelada', content: 'Actualización ficticia: se canceló la campaña al modificarse el plan de producción. No se simulan devoluciones ni compromisos de entrega.' }]
  }
]
