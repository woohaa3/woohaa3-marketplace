# PhotoCraft 归档规格与 change

本目录是旧独立子项目（`photocraft/`）的 OpenSpec 快照：22 份规格与 20 个已归档 change。

**不是可直接绑定的 OpenSpec 项目**：这里没有 `openspec/config.yaml`，`pnpm atc:bind-change --project` 指到
这里会一路向上找到父仓根。当前生效的 PhotoCraft 能力规格在主仓 `openspec/specs/photocraft-*`；新的
change 按宿主项目走。

也没有可运行的构建入口：规格与 change 里出现的 `rust/crates/…`、`packages/editor/…`、
`vendor/photocraft/…`、`pnpm -C photocraft run …` 都指向已删除的旧子项目，保留它们只为追溯当时的
交付依据。当前实现见 [`../web`](../web/README.md) 与 [`../notes`](../notes/README.md)。

目录里各 change 的 `specs/**/spec.md` 是当时的 delta 规格；`specs/` 下按能力名平铺的是归档后的汇总版本。
