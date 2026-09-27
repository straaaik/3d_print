# Blender Asset Brief — Workshop MVP

Этот файл описывает только повторно используемые 3D-ассеты. Комната/столы/стойки строятся в Three.js динамически.

## A1-style

Назначение: открытый FDM printer. Не точная копия бренда и без логотипов. Силуэт: светлая база, две вертикальные стойки, верхняя поперечина, горизонтальная X-rail, print head, bed, маленький экран и верхняя/задняя катушка.

Целевые размеры: ~0.52 × 0.46 × 0.82 м. Origin в центре нижней плоскости. Материалы: LightBody, DarkMechanics, BuildPlate, Accent. Целевой бюджет: 5k–15k tris; MVP placeholder может быть существенно легче.

## P1-style

Назначение: закрытый CoreXY-style printer. Без логотипов. Силуэт: тёмный кубический enclosure, четыре стойки, top/base, прозрачная передняя панель, bed, X rail, print head, маленький экран.

Целевые размеры: ~0.48 × 0.48 × 0.65 м. Origin в центре нижней плоскости. Бюджет 5k–15k tris.

## Filament spool

Одна универсальная геометрия. Цвет filament должен назначаться на сайте из `filament.color`. Flanges — graphite, центральная нить — отдельный material slot. Размер ~210 mm diameter.

## Naming

A1: `A1_*`
P1: `P1_*`
Spool: `Spool_*`

## Экспорт

`public/models/workshop/printer-a1.glb`
`public/models/workshop/printer-p1.glb`
`public/models/workshop/filament-spool.glb`

Не объединять модели в один файл.
