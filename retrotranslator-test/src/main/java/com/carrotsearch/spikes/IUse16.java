
package com.carrotsearch.spikes;

import java.util.Arrays;

public class IUse16
{
    public static void main(String [] args)
    {
        System.out.println("Hello. I use 1.6 API.");

        byte [] array = new byte [] {1, 2, 3};
        Arrays.copyOf(array, 1);

        new Runnable()
        {
            @Override
            public void run()
            {
            }
        }.run();
    }
}
