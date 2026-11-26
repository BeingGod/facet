"""Shared culling heuristic score.

The fixed linear blend used to rank photos within a burst/scene/similar group for
auto-cull. Extracted here so the auto-cull API (``api/routers/burst_culling.py``)
and the learned keeper head's baseline (``optimization/keeper_head.py``) compute
the *identical* formula — the keeper head is gated on beating this exact score,
so a single source of truth is required.
"""

DEFAULT_BURST_WEIGHTS = (0.4, 0.25, 0.2, 0.15, 0.0, 0.0, 0.0, 0.0, 0.0)


def burst_weights_from_config(cfg):
    """(aggregate, aesthetic, sharpness, blink, eyes, expression, liqe, exposure,
    highlight_clip_penalty) weights.

    Reads a ``burst_scoring`` config dict, falling back to the default per key.
    Eyes/expression/liqe/exposure/highlight-clip default to 0 so behavior is
    unchanged unless configured.
    """
    cfg = cfg or {}
    d_agg, d_aes, d_sharp, d_blink, d_eyes, d_expr, d_liqe, d_expo, d_hclip = DEFAULT_BURST_WEIGHTS
    return (
        cfg.get('weight_aggregate', d_agg),
        cfg.get('weight_aesthetic', d_aes),
        cfg.get('weight_sharpness', d_sharp),
        cfg.get('weight_blink', d_blink),
        cfg.get('weight_eyes', d_eyes),
        cfg.get('weight_expression', d_expr),
        cfg.get('weight_liqe', d_liqe),
        cfg.get('weight_exposure', d_expo),
        cfg.get('penalty_highlight_clipped', d_hclip),
    )


def compute_burst_score(photo, weights=DEFAULT_BURST_WEIGHTS):
    """Burst culling score for ranking photos within a group.

    Eyes/expression contributions only apply to photos with faces; their default
    weights are 0 so they are inert unless configured.
    """
    weights = tuple(weights) + DEFAULT_BURST_WEIGHTS[len(weights):]
    w_agg, w_aes, w_sharp, w_blink, w_eyes, w_expr, w_liqe, w_expo, w_hclip = weights
    aggregate = photo.get('aggregate') or 0
    aesthetic = photo.get('aesthetic') or 0
    sharpness = photo.get('tech_sharpness') or 0
    # is_blink NULL is unknown, not "eyes open": the face pass failed, or a
    # face had no measured blink (e.g. mediapipe absent in permissive mode).
    # The blink contribution is skipped, like eyes/expression below.
    is_blink = photo.get('is_blink')
    blink = 0 if is_blink is None else (0 if is_blink else 10)
    score = (aggregate * w_agg + aesthetic * w_aes
             + sharpness * w_sharp + blink * w_blink)
    # LIQE/exposure: a NULL (not scored) contributes nothing, like eyes below.
    # highlight_clipped is a 0/1 flag; a clipped frame loses w_hclip points.
    if w_liqe and photo.get('liqe_score') is not None:
        score += photo['liqe_score'] * w_liqe
    if w_expo and photo.get('exposure_score') is not None:
        score += photo['exposure_score'] * w_expo
    if w_hclip and photo.get('highlight_clipped'):
        score -= w_hclip
    if (photo.get('face_count') or 0) > 0:
        eyes = photo.get('eyes_open_score')
        expr = photo.get('expression_score')
        if eyes is not None:
            score += eyes * w_eyes
        if expr is not None:
            score += expr * w_expr
    return score
