package com.carrotsearch.javastructs;

import com.carrotsearch.javastructs.annotations.Struct;

/**
 * A simple structure-class (pseudo value type).
 */
@Struct(dimensions = {1, 2})
public final class BattleshipsCell
{
    public boolean hasShip;
    public boolean hit;
    public int damageLevel;
    public byte owner;
}
