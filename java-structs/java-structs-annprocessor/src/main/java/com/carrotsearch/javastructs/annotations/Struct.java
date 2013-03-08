package com.carrotsearch.javastructs.annotations;

import java.lang.annotation.*;

/**
 * Identifies a structure-definition class from which parallel array 
 * code is generated using <code>java-struct</code> project's APT processors.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.CLASS)
public @interface Struct {
  /**
   * Generate code for the following n-dimensional structure arrays. A class
   * will be generated for each dimension with naming convention
   * <code>StructureArray<span style="color: red;">N</span>D</code>, where N is
   * the dimension.
   * 
   * Single dimensional arrays (the default) do not have the <code>1D</code>
   * suffix.
   */
  int[] dimensions() default {1};
  
  /**
   * The field storage format to use in the generated arrays.
   */
  FieldStorage storage() default FieldStorage.PARALLEL_ARRAYS;
}
